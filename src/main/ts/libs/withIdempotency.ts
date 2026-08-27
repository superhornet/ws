import type { Request, Response } from "express";
import { IdempotencyKey } from "../models/IdempotencyKey.ts";
import { HTMLStatusError } from "./HTMLStatusError.ts";
import type { CachedResponse } from "../types/IdempotencyTypes.ts";

const IDEMPOTENCY_KEY_HEADER = "idempotency-key";
const MAX_KEY_LENGTH = 255;
const IN_PROGRESS_RETRY_AFTER_SECONDS = 1;

/**
 * Wraps a handler's mutation logic with idempotency protection.
 *
 * The Idempotency-Key header is required — requests without it (or with a
 * key exceeding MAX_KEY_LENGTH) are rejected with 428 Precondition Required.
 * This prevents accidental duplicate financial operations from network retries.
 *
 * When the header is present:
 *   - First request: acquires lock, runs callback, caches response, returns it.
 *   - Duplicate with completed original: returns cached response immediately.
 *   - Duplicate while original is in-flight: returns 409 Conflict.
 *   - Callback throws: marks the key failed (terminal) and rethrows. The lock is
 *     never deleted, because the external side-effect may already have executed;
 *     a retry with the same key is refused (409) so the operation cannot run
 *     twice. To genuinely re-attempt, the client must use a new idempotency key.
 */
export async function withIdempotency(
    req: Request,
    res: Response,
    sessionId: string,
    routePath: string,
    callback: () => Promise<CachedResponse>
): Promise<void> {
    const idempotencyKey = req.headers[IDEMPOTENCY_KEY_HEADER] as string | undefined;

    if (!idempotencyKey || idempotencyKey.length > MAX_KEY_LENGTH) {
        throw new HTMLStatusError("Precondition required", 428);
    }

    const existing = await IdempotencyKey.acquire(sessionId, idempotencyKey, routePath);

    if (existing) {
        if (existing.status === "completed" && existing.response_body) {
            if (!existing.response_code) {
                throw new HTMLStatusError("Cached response is malformed", 500);
            }
            res.setHeader("Idempotent-Replayed", "true");
            res.status(existing.response_code).json(existing.response_body);
            return;
        }

        if (existing.status === "in_progress") {
            res.setHeader("Retry-After", String(IN_PROGRESS_RETRY_AFTER_SECONDS));
            throw new HTMLStatusError("Conflict", 409);
        }

        if (existing.status === "failed") {
            throw new HTMLStatusError("Previous request with this idempotency key failed; retry with a new key", 409);
        }
    }

    try {
        const result = await callback();

        await IdempotencyKey.complete(
            sessionId,
            idempotencyKey,
            routePath,
            result.code,
            result
        );

        res.status(result.code).json(result);
    } catch (error) {
        await IdempotencyKey.markFailed(sessionId, idempotencyKey, routePath);
        throw error;
    }
}

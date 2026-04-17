import type { Request, Response } from "express";
import { IdempotencyKey } from "../models/IdempotencyKey.ts";
import { HTMLStatusError } from "./HTMLStatusError.ts";
import type { CachedResponse } from "../types/IdempotencyTypes.ts";

const IDEMPOTENCY_KEY_HEADER = "idempotency-key";
const MAX_KEY_LENGTH = 255;

/**
 * Wraps a handler's mutation logic with idempotency protection.
 *
 * The Idempotency-Key header is required — requests without it are rejected
 * with 400. This prevents accidental duplicate financial operations from
 * network retries.
 *
 * When the header is present:
 *   - First request: acquires lock, runs callback, caches response, returns it.
 *   - Duplicate with completed original: returns cached response immediately.
 *   - Duplicate while original is in-flight: returns 409 Conflict.
 *   - Callback throws: releases the lock so retries can proceed.
 */
export async function withIdempotency(
    req: Request,
    res: Response,
    sessionId: string,
    routePath: string,
    callback: () => Promise<CachedResponse>
): Promise<void> {
    const idempotencyKey = req.headers[IDEMPOTENCY_KEY_HEADER] as string | undefined;

    if (!idempotencyKey) {
        throw new HTMLStatusError(
            "Idempotency-Key header is required for this endpoint",
            400
        );
    }

    if (idempotencyKey.length === 0 || idempotencyKey.length > MAX_KEY_LENGTH) {
        throw new HTMLStatusError(
            `Idempotency-Key must be between 1 and ${MAX_KEY_LENGTH} characters`,
            400
        );
    }

    const existing = await IdempotencyKey.acquire(sessionId, idempotencyKey, routePath);

    if (existing) {
        if (existing.status === "completed" && existing.response_body) {
            res.setHeader("Idempotent-Replayed", "true");
            res.status(existing.response_code ?? 200).json(existing.response_body);
            return;
        }

        if (existing.status === "in_progress") {
            throw new HTMLStatusError(
                "A request with this Idempotency-Key is already in progress",
                409
            );
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
        await IdempotencyKey.release(sessionId, idempotencyKey, routePath);
        throw error;
    }
}

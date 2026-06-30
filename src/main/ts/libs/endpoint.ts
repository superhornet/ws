import type { Request, Response } from "express";
import { Audit } from "../models/Audit.ts";
import JSONResponse from "./JSONResponse.ts";
import { HTMLStatusError, processError } from "./HTMLStatusError.ts";
import { resolveSession } from "./session.ts";

/**
 * The outcome of an endpoint's work, describing how to respond. The helper —
 * not the handler — sends the HTTP response, so "forgot to respond" is not a
 * reachable state: every successful `run()` must return one of these.
 *
 * - `ok`        → 200, used by reads (GET).
 * - `created`   → 201, used by resource creation (POST).
 * - `accepted`  → 202, used by updates (PUT).
 * - `noContent` → 204, used by deletes (DELETE).
 */
export type EndpointResult =
    | { status: "ok"; data: unknown }
    | { status: "created"; data: unknown }
    | { status: "accepted"; data?: unknown }
    | { status: "noContent" };

export interface EndpointPlan {
    /** Audit message describing the request. */
    message: string;
    /**
     * Authorization step run before the audit entry and the work. Throw an
     * HTMLStatusError to deny access. This is also where a mutation resolves the
     * acting user and stamps it onto the payload (e.g. `owner_identifier` /
     * `initiated_by`) so clients cannot act on another user's behalf.
     */
    authorize?: () => Promise<void>;
    /** Performs the read/mutation and returns how to respond. */
    run: () => Promise<EndpointResult>;
}

/**
 * Single shared flow for every authenticated `/api` endpoint (reads and writes
 * alike). `sessionAuth` has already proven the session is valid; this helper
 * sequences the per-request concerns in one canonical order so behavior never
 * diverges by HTTP verb:
 *
 *   plan() → resolve session → authorize → audit → run → respond
 *
 * `plan()` runs first so body/param validation (400) takes precedence over a
 * missing session (403). `authorize` runs before the audit entry so denied
 * requests are never recorded as if they happened. The helper owns the response
 * based on the `EndpointResult` that `run()` returns, so a handler can never
 * leave a request hanging.
 */
export async function endpoint(
    req: Request,
    res: Response,
    plan: () => EndpointPlan,
): Promise<void> {
    try {
        const { message, authorize, run } = plan();
        const session = resolveSession(req);
        if (authorize) {
            await authorize();
        }
        await Audit.logMessage(message, session);
        const result = await run();
        switch (result.status) {
            case "ok":
                JSONResponse.goodToGo(req, res, "OK", result.data as unknown as JSON);
                break;
            case "created":
                JSONResponse.creationSuccess(req, res, "Created", result.data as unknown as JSON);
                break;
            case "accepted":
                JSONResponse.updateSuccess(req, res, "Accepted", (result.data ?? null) as unknown as JSON);
                break;
            case "noContent":
                JSONResponse.noContent(req, res, "No content", null);
                break;
            default: {
                const _exhaustive: never = result;
                throw new HTMLStatusError(`Unhandled endpoint result: ${JSON.stringify(_exhaustive)}`, 500);
            }
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
}

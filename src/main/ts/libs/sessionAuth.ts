import type * as express from "express";
import { HTMLStatusError, processError } from "./HTMLStatusError.ts";
import { query } from "./postgresDB.ts";
import { readSessionToken } from "./session.ts";

/**
 * Central session gate for all /api routes mounted after it.
 *
 * Reads the session token from the X-Session header, falling back to
 * req.body.session for legacy mutation routes, and validates it against the
 * sessions table (unexpired match required). Replaces the previous
 * presence-only checks, which accepted any well-formed string as auth.
 *
 * Note: this authenticates that a session exists and is unexpired. The session
 * may still be anonymous (not yet bound to a user via signup/login); when it is
 * bound, the user_identifier is attached to `req.authUser` for downstream
 * authorization. Per-resource ownership is enforced in the controllers.
 */
export async function sessionAuth(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
): Promise<void> {
    try {
        const sessionId = readSessionToken(req);
        if (!sessionId) {
            throw new HTMLStatusError("Forbidden", 403);
        }
        const rows = await query<{ user_identifier: string | null }>(
            "SELECT user_identifier FROM sessions WHERE uuid = $1 AND expires > NOW()",
            [sessionId],
        );
        const row = rows.at(0);
        if (!row) {
            throw new HTMLStatusError("Forbidden", 403);
        }
        req.authUser = row.user_identifier ?? null;
        next();
    } catch (error) {
        if (error instanceof HTMLStatusError) {
            processError(req, res, error);
        } else {
            // Don't leak raw database/internal error messages to the client.
            processError(req, res, new HTMLStatusError("Internal Server Error", 500));
        }
    }
}

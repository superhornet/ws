import type * as express from "express";
import { HTMLStatusError, processError } from "./HTMLStatusError.ts";
import { query } from "./postgresDB.ts";

/**
 * Central session gate for all /api routes mounted after it.
 *
 * Reads the session token from the X-Session header, falling back to
 * req.body.session for legacy mutation routes, and validates it against the
 * sessions table (unexpired match required). Replaces the previous
 * presence-only checks, which accepted any well-formed string as auth.
 *
 * Note: this authenticates that a session exists and is unexpired. It does NOT
 * bind the session to a user
 */
export async function sessionAuth(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
): Promise<void> {
    try {
        const sessionId =
            (req.headers["x-session"] as string | undefined) ?? req.body?.session;
        if (!sessionId) {
            throw new HTMLStatusError("Forbidden", 403);
        }
        const rows = await query(
            "SELECT id FROM sessions WHERE uuid = $1 AND expires > NOW()",
            [sessionId],
        );
        if (rows.length === 0) {
            throw new HTMLStatusError("Forbidden", 403);
        }
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
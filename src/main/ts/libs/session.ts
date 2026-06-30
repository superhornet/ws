import type * as express from "express";
import { HTMLStatusError } from "./HTMLStatusError.ts";

/**
 * Reads the session token from the `X-Session` header first, falling back to
 * the legacy `body.session` field. Returns `undefined` when neither is present
 * so callers can decide how to react.
 *
 * The header path is required for clients such as React Native, whose `fetch`
 * cannot send a body on GET requests; the body fallback keeps older callers
 * working.
 */
export function readSessionToken(req: express.Request): string | undefined {
    const headerSession = req.headers?.["x-session"] as string | undefined;
    const bodySession = (req.body as { session?: string } | undefined)?.session;
    return headerSession || bodySession || undefined;
}

export function getSession(req: express.Request): string {
    const session = req.headers["x-session"] as string | undefined;
    if (!session) {
        throw new HTMLStatusError("Session ID Required", 403);
    }
    return session;
}

/**
 * Resolves the session token from the `X-Session` header or legacy `body.session`,
 * throwing a 403 when neither is present.
 */
export function resolveSession(req: express.Request): string {
    const session = readSessionToken(req);
    if (!session) {
        throw new HTMLStatusError("Session ID Required", 403);
    }
    return session;
}

export function requireSessionFromBody<T extends { session?: string }>(
    data: T,
): asserts data is T & { session: string } {
    if (!data.session) {
        throw new HTMLStatusError("Session ID Required", 403);
    }
}

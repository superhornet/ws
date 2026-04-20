import type * as express from "express";
import { HTMLStatusError } from "./HTMLStatusError.ts";

export function getSession(req: express.Request): string {
    const session = req.headers["x-session"] as string | undefined;
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

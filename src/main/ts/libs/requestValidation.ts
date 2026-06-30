import type * as express from "express";
import { HTMLStatusError } from "./HTMLStatusError.ts";

export function requireBody(req: express.Request, message = "Empty JSON body"): void {
    if (!req.body || Object.keys(req.body).length === 0) {
        throw new HTMLStatusError(message, 400);
    }
}

export function requireGuid(value: string | undefined, label: string): asserts value is string {
    if (!value) {
        throw new HTMLStatusError(`${label} GUID is required`, 400);
    }
}

/**
 * Safely reads a single string value from a parsed query string entry.
 *
 * Express query values may be `string`, `string[]`, or a nested object. This
 * normalizes those cases to a single `string`, returning the first element for
 * arrays and `undefined` for anything that is not a string.
 */
export function getQueryString(value: unknown): string | undefined {
    if (Array.isArray(value)) {
        return typeof value[0] === "string" ? value[0] : undefined;
    }
    return typeof value === "string" ? value : undefined;
}

/**
 * Resolves a request parameter from the query string (preferred), falling back
 * to legacy JSON-body locations. This is the single home for the
 * "query-param-or-legacy-body" precedence rule that read endpoints relied on as
 * scattered `getQueryString(...) ?? req.body?...` chains.
 *
 * `queryKeys` is tried first, in order, against `req.query`. If none yields a
 * string, each `bodyFallbacks` value (already plucked from the body by the
 * caller, since body shapes differ per route) is returned if it is a non-empty
 * string. Returns `undefined` when nothing matches.
 *
 * TODO: drop the body fallbacks once all clients send query params / headers.
 */
export function queryOrBody(
    req: express.Request,
    queryKeys: string | string[],
    ...bodyFallbacks: unknown[]
): string | undefined {
    const keys = Array.isArray(queryKeys) ? queryKeys : [queryKeys];
    for (const key of keys) {
        const fromQuery = getQueryString(req.query[key]);
        if (fromQuery !== undefined) {
            return fromQuery;
        }
    }
    for (const fallback of bodyFallbacks) {
        if (typeof fallback === "string" && fallback.length > 0) {
            return fallback;
        }
    }
    return undefined;
}

export function requireParam(value: string | undefined, label: string): asserts value is string {
    if (!value) {
        throw new HTMLStatusError(`${label} is required`, 400);
    }
}

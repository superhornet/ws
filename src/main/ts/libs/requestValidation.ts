import type * as express from "express";
import { HTMLStatusError } from "./HTMLStatusError.ts";

export function requireBody(req: express.Request): void {
    if (!req.body || Object.keys(req.body).length === 0) {
        throw new HTMLStatusError("Empty JSON body", 400);
    }
}

export function requireGuid(value: string | undefined, label: string): asserts value is string {
    if (!value) {
        throw new HTMLStatusError(`${label} GUID is required`, 400);
    }
}

import type * as express from "express";
import { HTMLStatusError } from "./HTMLStatusError.ts";

export function requireBody(req: express.Request): void {
    if (!req.body || Object.keys(req.body).length === 0) {
        throw new HTMLStatusError("Empty JSON body", 400);
    }
}

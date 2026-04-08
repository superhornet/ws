import type { Request, Response, NextFunction } from "express";

function escapeHtml(str: string): string {
    return str
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#x27;");
}

function sanitizeObject(obj: Record<string, unknown>): void {
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (typeof val === "string") {
            obj[key] = escapeHtml(val);
        } else if (val !== null && typeof val === "object" && !Array.isArray(val)) {
            sanitizeObject(val as Record<string, unknown>);
        }
    }
}

export function sanitizeBody(req: Request, _res: Response, next: NextFunction): void {
    if (req.body && typeof req.body === "object") {
        sanitizeObject(req.body as Record<string, unknown>);
    }
    next();
}

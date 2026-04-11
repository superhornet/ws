import type { Request, Response, NextFunction } from "express";
import { Session } from "../models/Session.ts";
import JSONResponse from "./JSONResponse.ts";

export async function sessionAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    const session: unknown = req.body?.session;

    if (!session || typeof session !== "string" || session.length !== 36) {
        JSONResponse.unauthorized(req, res, "Valid session ID required", null);
        return;
    }

    const isValid = await Session.validate(session);
    if (!isValid) {
        JSONResponse.unauthorized(req, res, "Invalid or expired session", null);
        return;
    }

    next();
}

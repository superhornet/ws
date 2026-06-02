import * as express from "express";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
import JSONResponse from "../libs/JSONResponse.ts";
import { type SubStackAPIType } from "../types/SubStackAPITypes.ts";
import { Audit } from "../models/Audit.ts";
import { SubStack } from "../models/SubStack.ts";
import { Session } from "../models/Session.ts";

export const router = express.Router();

/**
 * Create SubStack
 */
router.post("/substack", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON Body", 400);
        }
        const s: { data: SubStackAPIType, message: string, session: string } = req.body;

        if (s.session === undefined || s.session.length === 0) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else if (await Session.exists(s.session)) {
            await Audit.logMessage(s.message, s.session);
            const substack = await SubStack.storeSubStack(s.data);
            JSONResponse.creationSuccess(req, res, "Created", substack as unknown as JSON);
        } else {
            throw new HTMLStatusError("Unauthorized", 403);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});
/**
 * List SubStacks by Stack
 */
router.get("/substacks", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON Body", 400);
        }
        req.body.data = req.body.data[0];
        const s: { type: string, data: SubStackAPIType, message: string, session: string } = req.body;

        if (s.session === undefined || s.session.length === 0) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else if (await Session.exists(s.session)) {
            await Audit.logMessage(s.message, s.session);
            const substacks = await SubStack.getSubStack(s.type, s.data);
            JSONResponse.goodToGo(req, res, "OK", substacks as unknown as JSON);
        } else {
            throw new HTMLStatusError("Unauthorized", 403);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});
/**
 * Rename a substack
 */
router.put("/substack", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON Body", 400);
        }
        const s: { data: SubStackAPIType, message: string, session: string } = req.body;

        if (s.session === undefined || s.session.length === 0) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else if (await Session.exists(s.session)) {
            await Audit.logMessage(s.message, s.session);
            if (await SubStack.renameSubstack(s.data)) {
                JSONResponse.updateSuccess(req, res, "Accepted", null);
            }
        } else {
            throw new HTMLStatusError("Unauthorized", 403);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});
router.delete("/substack", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON Body", 400);
        }
        const s: { data: SubStackAPIType, message: string, session: string } = req.body;

        if (s.session === undefined || s.session.length === 0) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else if (await Session.exists(s.session)) {
            await Audit.logMessage(s.message, s.session);
            if (await SubStack.deleteSubstack(s.data)) {
                JSONResponse.noContent(req, res, "No content", null);
            }
        } else {
            throw new HTMLStatusError("Unauthorized", 403);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

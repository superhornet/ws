import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
import { Audit } from "../models/Audit.ts";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
import type { StackAPIType } from "../types/StackAPITypes.ts";
import { Stack } from "../models/Stack.ts";
import { Session } from "../models/Session.ts";
export const router = express.Router();

/**
 * Create a Stack
 */
router.post("/stack", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const s: { data: StackAPIType, message: string, session: string } = req.body;

        if (s.session === undefined || s.session.length === 0) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else if (await Session.exists(s.session)) {
            await Audit.logMessage(s.message, s.session);
            const stack = await Stack.storeStack(s.data);
            JSONResponse.creationSuccess(req, res, "Created", stack as unknown as JSON);
        } else {
            throw new HTMLStatusError("Unauthorized", 403);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

/**
 * List a user's stacks
 */
router.get("/stacks", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const s: { data: StackAPIType, message: string, session: string } = req.body;
        if (s.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else if (await Session.exists(s.session)) {
            Audit.logMessage(s.message, s.session);
            const stacks: Array<StackAPIType> = await Stack.getForUser(s.data.owner_identifier || "");
            JSONResponse.goodToGo(req, res, "OK", stacks as unknown as JSON)
        } else {
            throw new HTMLStatusError("Unauthorized", 403);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError)
    }
});

/**
 * Update a stack's name
*/
router.put("/stack", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const s: { data: StackAPIType, message: string, session: string } = req.body;
        if (s.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else if (await Session.exists(s.session)) {
            Audit.logMessage(s.message, s.session);
            if (await Stack.updateStack(s.data)) {
                JSONResponse.updateSuccess(req, res, "Accepted", null)
            }
        } else {
            throw new HTMLStatusError("Unauthorized", 403);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError)
    }
});

/**
 * Delete a stack
 */
router.delete("/stack", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const s: { data: StackAPIType, message: string, session: string } = req.body;
        if (s.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else if (await Session.exists(s.session)) {
            Audit.logMessage(s.message, s.session);
            if (await Stack.deleteStack(s.data.stack_identifier || "")) {
                JSONResponse.noContent(req, res, "No content", null)
            }
        } else {
            throw new HTMLStatusError("Unauthorized", 403);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError)
    }
});

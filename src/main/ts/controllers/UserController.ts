import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
import { Audit } from "../models/Audit.ts";
import { User } from "../models/User.ts";
import type { UserAPIType } from "../types/UserAPITypes.ts";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
//import { userCreationLimiter } from "../libs/rateLimiter.ts";
import { Session } from "../models/Session.ts";
export const router = express.Router();

/**
 * Create a User
 */
router.post("/user", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: { data: UserAPIType, message: string, session: string } = req.body;
        if (data.session === undefined || data.session.length === 0) {
            throw new HTMLStatusError("Unauthorized", 403);
        } else if (await Session.exists(data.session)) {
            await Audit.logMessage(data.message, data.session);
            const user = await User.storeUser(data.data);
            if (user)
                JSONResponse.creationSuccess(req, res, "Created", user as unknown as JSON);
        } else {
            throw new HTMLStatusError("Session ID Required", 403);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

/**
 *
 * Read a user
 *
 * Input is the identifier passed via request body identifier
 */
router.get("/user", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new Error("Empty JSON body");
        }
        const data: { message: string, session: string, user_identifier: string } = req.body;

        if (data.session === undefined || data.session.length === 0) {
            throw new HTMLStatusError("Unauthorized", 403);
        } else if (await Session.exists(data.session)) {
            await Audit.logMessage(`Get /api/user/${data.user_identifier}`, data.session);
            const user = await User.fetchByUuid(data.user_identifier);
            JSONResponse.goodToGo(req, res, "OK", user as unknown as JSON);
        } else {
            throw new HTMLStatusError("Session ID Required", 403);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});
/**
 * Update a user
 */
router.put("/user", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: { data: UserAPIType, message: string, session: string, user_identifier: string } = req.body;
        data.data.user_identifier = data.user_identifier;
        if (data.session === undefined || data.session.length === 0) {
            throw new HTMLStatusError("Unauthorized", 403);
        } else if (await Session.exists(data.session)) {
            await Audit.logMessage(`Put /api/user/${data.user_identifier}`, data.session);
            if (await User.updateUser(data.data)) {
                JSONResponse.updateSuccess(req, res, "Accepted", null);
            }
        } else {
            throw new HTMLStatusError("Session ID Required", 403);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

/**
 * Delete a user
 */
router.delete("/user", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: { user: UserAPIType, message: string, session: string, user_identifier: string } = req.body;
        if (data.session === undefined || data.session.length === 0) {
            throw new HTMLStatusError("Unauthorized", 403);
        } else if (await Session.exists(data.session)) {
            await Audit.logMessage(`Delete /api/user/${data.user_identifier}`, data.session);
            if (await User.deleteUser(data.user_identifier)) {
                JSONResponse.noContent(req, res, "No Content", null);
            }
        } else {
            throw new HTMLStatusError("Session ID Required", 403);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

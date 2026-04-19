import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
import { Audit } from "../models/Audit.ts";
import { User } from "../models/User.ts";
import type { UserAPIType } from "../types/UserAPITypes.ts";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
export const router = express.Router();

function getSession(req: express.Request): string {
    const session = req.headers["x-session"] as string | undefined;
    if (!session) {
        throw new HTMLStatusError("Session ID Required", 403);
    }
    return session;
}

/**
 * Create a User
 */
router.post("/user", (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: UserAPIType = req.body;
        if (data.session) {
            new Audit(data.message, data.session);
            const user = new User({
                nameF: data.firstname,
                nameL: data.lastname,
                email: data.email,
                address1: data.address1,
                address2: data.address2,
                city: data.city,
                state: data.state,
                subscriptionLevel: data.level
            });

            JSONResponse.creationSuccess(req, res, "Created", user.toJSON() as unknown as JSON);
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
        const session = getSession(req);
        const identifier = req.query.identifier as string | undefined;
        if (!identifier) {
            throw new HTMLStatusError("User identifier is required", 400);
        }
        new Audit(`Get /api/user/${identifier}`, session);
        const user = await User.fetchById(identifier);
        JSONResponse.goodToGo(req, res, "OK", user as unknown as JSON);
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
        const data: UserAPIType = req.body;

        if (data.session) {
            new Audit(`Put /api/user/ ${data.identifier}`, data.session);
            await User.updateUser(data);
            JSONResponse.updateSuccess(req, res, "Accepted", null);
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
        const data: UserAPIType = req.body;

        if (data.session === undefined) {
            throw new Error("Session ID Required");
        } else {
            new Audit(`Delete /api/user/ ${data.identifier}`, data.session);
            await User.deleteUser(data);
            JSONResponse.noContent(req, res, "No Content", null);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

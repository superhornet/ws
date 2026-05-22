import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
import { Audit } from "../models/Audit.ts";
import { User } from "../models/User.ts";
import type { UserAPIType } from "../types/UserAPITypes.ts";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
import { getSession, requireSessionFromBody } from "../libs/session.ts";
import { requireBody } from "../libs/requestValidation.ts";
import { userCreationLimiter } from "../libs/rateLimiter.ts";
export const router = express.Router();

/**
 * Create a User
 */
router.post("/user", userCreationLimiter, async (req, res) => {
    try {
        requireBody(req);
        const data: UserAPIType = req.body;
        requireSessionFromBody(data);

        const user = await User.create({
            firstname: data.firstname,
            lastname: data.lastname,
            email: data.email,
            address1: data.address1,
            address2: data.address2,
            city: data.city,
            state: data.state,
            level: data.level
        });
        await Audit.create("POST /api/user", data.session);

        JSONResponse.creationSuccess(req, res, "Created", user.toJSON() as unknown as JSON);
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
        const user = await User.fetchById(identifier);
        await Audit.create(`GET /api/user/${identifier}`, session);
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
        requireBody(req);
        const data: UserAPIType = req.body;
        requireSessionFromBody(data);

        await User.updateUser(data);
        await Audit.create(`PUT /api/user/${data.identifier}`, data.session);
        JSONResponse.updateSuccess(req, res, "Accepted", null);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

/**
 * Delete a user
 */
router.delete("/user", async (req, res) => {
    try {
        requireBody(req);
        const data: UserAPIType = req.body;
        requireSessionFromBody(data);

        await User.deleteUser(data);
        await Audit.create(`DELETE /api/user/${data.identifier}`, data.session);
        JSONResponse.noContent(req, res, "No Content", null);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

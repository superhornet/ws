import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
import { Audit } from "../models/Audit.ts";
import { User } from "../models/User.ts";
import type { UserAPIType } from "../types/UserAPITypes.ts";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
import { getSession, requireSessionFromBody } from "../libs/session.ts";
import { requireBody } from "../libs/requestValidation.ts";
export const router = express.Router();

/**
 * Create a User
 */
router.post("/user", async (req, res) => {
    try {
        requireBody(req);
        const data: UserAPIType = req.body;
        requireSessionFromBody(data);

        new Audit("POST /api/user", data.session);
        const user = await User.create({
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
        new Audit(`GET /api/user/${identifier}`, session);
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
        requireBody(req);
        const data: UserAPIType = req.body;
        requireSessionFromBody(data);

        new Audit(`PUT /api/user/${data.identifier}`, data.session);
        await User.updateUser(data);
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

        new Audit(`DELETE /api/user/${data.identifier}`, data.session);
        await User.deleteUser(data);
        JSONResponse.noContent(req, res, "No Content", null);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
import { Audit } from "../models/Audit.ts";
import { User } from "../models/User.ts";
import type { UserAPIType } from "../types/UserAPITypes.ts";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
//import { userCreationLimiter } from "../libs/rateLimiter.ts";
import { Session } from "../models/Session.ts";
import { OtpRequest } from "../models/OtpRequest.ts";
import { queryOrBody, requireBody, requireParam } from "../libs/requestValidation.ts";
import { endpoint } from "../libs/endpoint.ts";
import { requireActingUser, assertSelf } from "../libs/authorization.ts";
export const router = express.Router();

/**
 * Create a User
 *
 * Signup is the moment a session becomes bound to a user: the request arrives on
 * a valid but still-anonymous session (created during the OTP flow), creates the
 * user, then binds the session to it. A session that is already bound cannot
 * create another user.
 *
 * This stays hand-rolled rather than using `endpoint`: it is the only mutation
 * that runs on an anonymous (pre-binding) session, so it cannot use
 * `requireActingUser`, and it owns the create-then-bind sequence directly.
 */
router.post("/user", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const u: { data: UserAPIType, message: string, session: string } = req.body;
        if (u.session === undefined || u.session.length === 0) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else if (await Session.exists(u.session)) {
            if (await Session.getUserForSession(u.session)) {
                throw new HTMLStatusError("Session is already associated with a user", 409);
            }
            await Audit.logMessage(u.message, u.session);
            // Link the phone proven during the signup OTP flow (kept on the
            // session's verified phone OTP) so login lookups by phone succeed.
            const verifiedPhone = await OtpRequest.verifiedPhoneForSession(u.session);
            const user = await User.storeUser(u.data, verifiedPhone);
            if (!user.user_identifier) {
                throw new HTMLStatusError("Failed to create user.", 500);
            }
            await Session.bindUser(u.session, user.user_identifier);
            JSONResponse.creationSuccess(req, res, "Created", user as unknown as JSON);
        } else {
            throw new HTMLStatusError("Unauthorized", 403);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

/**
 * Return the user the current session is bound to. Lets a returning client
 * (e.g. an app relaunch with a stored session) recover who it is logged in as.
 */
router.get("/me", (req, res) => endpoint(req, res, () => {
    let actingUser: string;
    return {
        message: "Get /api/me",
        authorize: async () => { actingUser = await requireActingUser(req); },
        run: async () => ({ status: "ok", data: await User.fetchByUuid(actingUser) }),
    };
}));

/**
 * Read a user.
 *
 * Input is the user identifier passed via query string (preferred) or legacy body field.
 */
router.get("/user", (req, res) => endpoint(req, res, () => {
    const user_identifier = queryOrBody(req, "user_identifier", req.body?.user_identifier);
    requireParam(user_identifier, "User identifier");
    const message = queryOrBody(req, "message", req.body?.message) ?? `Get /api/user/${user_identifier}`;
    return {
        message,
        authorize: async () => assertSelf(await requireActingUser(req), user_identifier),
        run: async () => ({ status: "ok", data: await User.fetchByUuid(user_identifier) }),
    };
}));

/**
 * Update a user
 */
router.put("/user", (req, res) => endpoint(req, res, () => {
    requireBody(req);
    const u: { data: UserAPIType, message: string, session: string, user_identifier: string } = req.body;
    u.data.user_identifier = u.user_identifier;
    return {
        message: `Put /api/user/${u.user_identifier}`,
        authorize: async () => assertSelf(await requireActingUser(req), u.user_identifier),
        run: async () => {
            await User.updateUser(u.data);
            return { status: "accepted" };
        },
    };
}));

/**
 * Delete a user
 */
router.delete("/user", (req, res) => endpoint(req, res, () => {
    requireBody(req);
    const u: { user: UserAPIType, message: string, session: string, user_identifier: string } = req.body;
    return {
        message: `Delete /api/user/${u.user_identifier}`,
        authorize: async () => assertSelf(await requireActingUser(req), u.user_identifier),
        run: async () => {
            await User.deleteUser(u.user_identifier);
            return { status: "noContent" };
        },
    };
}));

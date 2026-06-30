import * as express from "express";
import type { StackAPIType } from "../types/StackAPITypes.ts";
import { Stack } from "../models/Stack.ts";
import { queryOrBody, requireBody, requireParam } from "../libs/requestValidation.ts";
import { endpoint } from "../libs/endpoint.ts";
import { requireActingUser, assertSelf, assertStackAccess, assertStackOwner } from "../libs/authorization.ts";
export const router = express.Router();

/**
 * Create a Stack. The owner is always the acting user; any client-supplied
 * owner_identifier is ignored so a session cannot create stacks for someone else.
 */
router.post("/stack", (req, res) => endpoint(req, res, () => {
    requireBody(req);
    const s: { data: StackAPIType, message: string, session: string } = req.body;
    return {
        message: s.message,
        authorize: async () => {
            s.data.owner_identifier = await requireActingUser(req);
        },
        run: async () => ({ status: "created", data: await Stack.storeStack(s.data) }),
    };
}));

/**
 * List a user's stacks
 */
router.get("/stacks", (req, res) => endpoint(req, res, () => {
    const owner_identifier = queryOrBody(req, "owner_identifier", req.body?.data?.owner_identifier);
    requireParam(owner_identifier, "Owner identifier");
    const message = queryOrBody(req, "message", req.body?.message) ?? `List stacks for ${owner_identifier}`;
    return {
        message,
        authorize: async () => assertSelf(await requireActingUser(req), owner_identifier),
        run: async () => ({ status: "ok", data: await Stack.getForUser(owner_identifier) }),
    };
}));

/**
 * List the members of a shared stack
 */
router.get("/stack/members", (req, res) => endpoint(req, res, () => {
    const stack_identifier = queryOrBody(req, "stack_identifier", req.body?.data?.stack_identifier);
    requireParam(stack_identifier, "Stack identifier");
    const message = queryOrBody(req, "message", req.body?.message) ?? `List members for ${stack_identifier}`;
    return {
        message,
        authorize: async () => assertStackAccess(await requireActingUser(req), stack_identifier),
        run: async () => ({ status: "ok", data: await Stack.getMembers(stack_identifier) }),
    };
}));

/**
 * Update a stack's name
 */
router.put("/stack", (req, res) => endpoint(req, res, () => {
    requireBody(req);
    const s: { data: StackAPIType, message: string, session: string } = req.body;
    return {
        message: s.message,
        authorize: async () => assertStackOwner(await requireActingUser(req), s.data.stack_identifier),
        run: async () => {
            await Stack.updateStack(s.data);
            return { status: "accepted" };
        },
    };
}));

/**
 * Delete a stack
 */
router.delete("/stack", (req, res) => endpoint(req, res, () => {
    requireBody(req);
    const s: { data: StackAPIType, message: string, session: string } = req.body;
    return {
        message: s.message,
        authorize: async () => assertStackOwner(await requireActingUser(req), s.data.stack_identifier),
        run: async () => {
            await Stack.deleteStack(s.data.stack_identifier || "");
            return { status: "noContent" };
        },
    };
}));

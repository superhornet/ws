import * as express from "express";
import { HTMLStatusError } from "../libs/HTMLStatusError.ts";
import { SubStackQueryTypes, type SubStackAPIType, type SubStackLookup } from "../types/SubStackAPITypes.ts";
import { SubStack } from "../models/SubStack.ts";
import { queryOrBody, requireBody, requireParam } from "../libs/requestValidation.ts";
import { endpoint } from "../libs/endpoint.ts";
import { requireActingUser, assertSelf, assertStackAccess, assertStackOwner, assertSubstackAccess } from "../libs/authorization.ts";

export const router = express.Router();

/**
 * How each `GET /substacks` query type is validated and authorized. Declaring it
 * once as a table keeps the "which identifier is required" and "who may read it"
 * rules in a single place instead of fanning the same `switch (type)` across the
 * handler. `authorize` is async-or-void; the name-lookup case is intentionally a
 * no-op because shared substacks (e.g. the "Company Funds" fee substack) are
 * looked up globally by any authenticated user.
 */
const SUBSTACK_QUERY: Record<string, {
    field: keyof SubStackLookup;
    label: string;
    authorize: (actingUser: string, value: string) => Promise<void> | void;
}> = {
    [SubStackQueryTypes.STACKID]: {
        field: "stack_identifier",
        label: "Stack identifier",
        authorize: (actingUser, value) => assertStackAccess(actingUser, value),
    },
    [SubStackQueryTypes.OWNERID]: {
        field: "owner_identifier",
        label: "Owner identifier",
        authorize: (actingUser, value) => assertSelf(actingUser, value),
    },
    [SubStackQueryTypes.SUBSTACKNAME]: {
        field: "substack_name",
        label: "Substack name",
        authorize: () => {},
    },
};

/**
 * Create SubStack. Only the owner of the parent stack may add substacks to it.
 */
router.post("/substack", (req, res) => endpoint(req, res, () => {
    requireBody(req, "Empty JSON Body");
    const requestBody: { data: SubStackAPIType, message: string, session: string } = req.body;
    // Reject a malformed body (missing `data`/fields) here, during plan(), so it
    // becomes a 400 — authorize/run must never dereference an absent `data` and
    // surface a 500 instead.
    requireParam(requestBody.data?.stack_identifier, "Stack identifier");
    requireParam(requestBody.data?.substack_name, "Substack name");
    return {
        message: requestBody.message,
        authorize: async () => assertStackOwner(await requireActingUser(req), requestBody.data.stack_identifier),
        run: async () => ({ status: "created", data: await SubStack.storeSubStack(requestBody.data) }),
    };
}));

/**
 * List SubStacks by Stack
 */
router.get("/substacks", (req, res) => endpoint(req, res, () => {
    const type = queryOrBody(req, "type", req.body?.type);
    requireParam(type, "Substack query type");
    const entry = SUBSTACK_QUERY[type];
    if (!entry) {
        throw new HTMLStatusError("Invalid substack query type", 400);
    }
    // Body callers historically wrapped `data` in an array; support both that
    // legacy shape and a plain object, while query callers pass identifiers directly.
    const bodyData: Partial<SubStackAPIType> | undefined = Array.isArray(req.body?.data)
        ? req.body.data[0]
        : req.body?.data;
    const lookup: SubStackLookup = {
        stack_identifier: queryOrBody(req, "stack_identifier", bodyData?.stack_identifier),
        owner_identifier: queryOrBody(req, "owner_identifier", bodyData?.owner_identifier),
        substack_name: queryOrBody(req, "substack_name", bodyData?.substack_name),
    };
    const value = lookup[entry.field];
    requireParam(value, entry.label);
    const message = queryOrBody(req, "message", req.body?.message) ?? "List substacks";
    return {
        message,
        authorize: async () => entry.authorize(await requireActingUser(req), value),
        run: async () => ({ status: "ok", data: await SubStack.getSubStack(type, lookup) }),
    };
}));

/**
 * Rename a substack
 */
router.put("/substack", (req, res) => endpoint(req, res, () => {
    requireBody(req, "Empty JSON Body");
    const requestBody: { data: SubStackAPIType, message: string, session: string } = req.body;
    requireParam(requestBody.data?.substack_identifier, "Substack identifier");
    requireParam(requestBody.data?.substack_name, "Substack name");
    return {
        message: requestBody.message,
        authorize: async () => assertSubstackAccess(await requireActingUser(req), requestBody.data.substack_identifier),
        run: async () => {
            await SubStack.renameSubstack(requestBody.data);
            return { status: "accepted" };
        },
    };
}));

router.delete("/substack", (req, res) => endpoint(req, res, () => {
    requireBody(req, "Empty JSON Body");
    const requestBody: { data: SubStackAPIType, message: string, session: string } = req.body;
    requireParam(requestBody.data?.substack_identifier, "Substack identifier");
    return {
        message: requestBody.message,
        authorize: async () => assertSubstackAccess(await requireActingUser(req), requestBody.data.substack_identifier),
        run: async () => {
            await SubStack.deleteSubstack(requestBody.data);
            return { status: "noContent" };
        },
    };
}));

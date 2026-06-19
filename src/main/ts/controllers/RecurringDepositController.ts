import * as express from "express";
import { HTMLStatusError } from "../libs/HTMLStatusError.ts";
import { RecurringDeposit } from "../models/RecurringDeposit.ts";
import { queryOrBody, requireBody, requireParam } from "../libs/requestValidation.ts";
import { endpoint } from "../libs/endpoint.ts";
import { RecurringDepositQueryTypes, type RecurringDepositAPIType } from "../types/RecurringDepositAPITypes.ts";
import { requireActingUser, assertStackAccess, assertSubstackAccess, assertRecurringDepositAccess } from "../libs/authorization.ts";

export const router = express.Router();

/**
 * Who may read recurring deposits for a given query key. Declared once as a
 * table so the key→authorization mapping lives in one place rather than a
 * `switch`.
 */
const RECURRING_DEPOSIT_QUERY_AUTH: Record<string, (actingUser: string, value: string) => Promise<void> | void> = {
    [RecurringDepositQueryTypes.SUBSTACK]: (actingUser, value) => assertSubstackAccess(actingUser, value),
    [RecurringDepositQueryTypes.STACK]: (actingUser, value) => assertStackAccess(actingUser, value),
};

/**
 * Create a recurring deposit. The acting user must have access to the
 * destination substack money will be deposited into.
 */
router.post("/recurring-deposit", (req, res) => endpoint(req, res, () => {
    requireBody(req, "Empty JSON Body");
    const s: { data: RecurringDepositAPIType; message: string; session: string } = req.body;
    return {
        message: s.message,
        authorize: async () => assertSubstackAccess(await requireActingUser(req), s.data.to_identifier),
        run: async () => ({ status: "created", data: await RecurringDeposit.store(s.data) }),
    };
}));

/**
 * List recurring deposits by stack or substack
 */
router.get("/recurring-deposits", (req, res) => endpoint(req, res, () => {
    const key = queryOrBody(req, "key", req.body?.key);
    const value = queryOrBody(req, "value", req.body?.value);
    requireParam(key, "Recurring deposit query key");
    requireParam(value, "Recurring deposit query value");
    const authorizeForKey = RECURRING_DEPOSIT_QUERY_AUTH[key];
    if (!authorizeForKey) {
        throw new HTMLStatusError("Invalid recurring deposit query key", 400);
    }
    const message = queryOrBody(req, "message", req.body?.message) ?? `List recurring deposits by ${key}`;
    return {
        message,
        authorize: async () => authorizeForKey(await requireActingUser(req), value),
        run: async () => ({ status: "ok", data: await RecurringDeposit.getByKey(key, value) }),
    };
}));

/**
 * Update / edit a recurring deposit
 */
router.put("/recurring-deposit", (req, res) => endpoint(req, res, () => {
    requireBody(req, "Empty JSON Body");
    const s: { data: RecurringDepositAPIType; message: string; session: string } = req.body;
    return {
        message: s.message,
        authorize: async () => {
            const actingUser = await requireActingUser(req);
            await assertRecurringDepositAccess(actingUser, s.data.recurring_deposit_identifier);
            await assertSubstackAccess(actingUser, s.data.to_identifier);
        },
        run: async () => {
            await RecurringDeposit.update(s.data);
            return { status: "accepted" };
        },
    };
}));

/**
 * Cancel a recurring deposit
 */
router.delete("/recurring-deposit", (req, res) => endpoint(req, res, () => {
    requireBody(req, "Empty JSON Body");
    const s: { data: RecurringDepositAPIType; message: string; session: string } = req.body;
    return {
        message: s.message,
        authorize: async () => assertRecurringDepositAccess(await requireActingUser(req), s.data.recurring_deposit_identifier),
        run: async () => {
            await RecurringDeposit.remove(s.data.recurring_deposit_identifier || "");
            return { status: "noContent" };
        },
    };
}));

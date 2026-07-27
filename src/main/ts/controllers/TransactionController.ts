import * as express from "express";
import { HTMLStatusError } from "../libs/HTMLStatusError.ts";
import { TransactionQueryTypes, type TransactionAPIType } from "../types/TransactionAPITypes.ts";
import { Transaction } from "../models/Transaction.ts";
import { queryOrBody, requireBody, requireGuid, requireParam } from "../libs/requestValidation.ts";
import { endpoint } from "../libs/endpoint.ts";
import { requireActingUser, assertSelf, assertStackAccess, assertSubstackAccess } from "../libs/authorization.ts";

export const router = express.Router();

/**
 * Who may read transactions for a given query key. Declared once as a table so
 * the key→authorization mapping lives in one place rather than a `switch`.
 */
const TRANSACTION_QUERY_AUTH: Record<string, (actingUser: string, value: string) => Promise<void> | void> = {
    [TransactionQueryTypes.SUBSTACK]: (actingUser, value) => assertSubstackAccess(actingUser, value),
    [TransactionQueryTypes.STACK]: (actingUser, value) => assertStackAccess(actingUser, value),
    [TransactionQueryTypes.USER]: (actingUser, value) => assertSelf(actingUser, value),
};

/**
 * Create Transaction. The acting user is always recorded as the initiator and
 * must have access to the source substack money is moving out of.
 */
router.post("/transaction", (req, res) => endpoint(req, res, () => {
    requireBody(req, "Empty JSON Body");
    const requestBody: { data: TransactionAPIType, message: string, session: string } = req.body;
    // Reject a malformed body (missing `data`/source) here, during plan(), so it
    // becomes a 400 before session resolution/authorize run — the 403/401 checks
    // must never dereference an absent `data` and surface a 500 instead.
    requireGuid(requestBody.data?.from_identifier, "Transaction source");
    return {
        message: `Transaction $${(requestBody.data.amount / 100).toFixed(2)}: From ${requestBody.data.from_identifier} to ${requestBody.data.to_identifier}.`,
        authorize: async () => {
            const actingUser = await requireActingUser(req);
            requestBody.data.initiated_by = actingUser;
            await assertSubstackAccess(actingUser, requestBody.data.from_identifier);
        },
        run: async () => ({ status: "created", data: await Transaction.storeTransaction(requestBody.data) }),
    };
}));

/**
 * Read transactions
 */
router.get("/transactions", (req, res) => endpoint(req, res, () => {
    const key = queryOrBody(req, "key", req.body?.key);
    const value = queryOrBody(req, "value", req.body?.value);
    requireParam(key, "Transaction query key");
    requireParam(value, "Transaction query value");
    const authorizeForKey = TRANSACTION_QUERY_AUTH[key];
    if (!authorizeForKey) {
        throw new HTMLStatusError("Invalid transaction query key", 400);
    }
    const message = queryOrBody(req, "message", req.body?.message) ?? `List transactions by ${key}`;
    return {
        message,
        authorize: async () => authorizeForKey(await requireActingUser(req), value),
        run: async () => ({ status: "ok", data: await Transaction.getTransactions(key, value) }),
    };
}));

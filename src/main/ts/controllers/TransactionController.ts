import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
import { Audit } from "../models/Audit.ts";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
import { type TransactionAPIType } from "../types/TransactionAPITypes.ts";
import { Transaction } from "../models/Transaction.ts";
import { Session } from "../models/Session.ts";

export const router = express.Router();

/**
 * Create Transaction
 */
router.post("/transaction", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON Body", 400);
        }
        const t: {data: TransactionAPIType, message: string, session: string} = req.body;
        if (t.session === undefined || t.session.length === 0) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else if(await Session.exists(t.session)){
            await Audit.logMessage(`Transaction $${t.data.amount}: From ${t.data.from_identifier} to ${t.data.to_identifier}.`, t.session);
            const transaction = await Transaction.storeTransaction(t.data);
            JSONResponse.creationSuccess(req, res, 'Created', transaction as unknown as JSON);
        } else {
            throw new HTMLStatusError("Unauthorized", 403);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});
/**
 * Read transactions
 */
router.get("/transactions", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON Body", 400);
        }
        const t: {key: string, value: string, message: string, session: string} = req.body;
        if (t.session === undefined || t.session.length === 0) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else if (await Session.exists(t.session)) {
            await Audit.logMessage(t.message, t.session);
            const transactions = await Transaction.getTransactions(t.key, t.value);
            JSONResponse.goodToGo(req, res, "OK", transactions as unknown as JSON);
        } else {
            throw new HTMLStatusError("Unauthorized", 403);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
import { Audit } from "../models/Audit.ts";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
import { getSession } from "../libs/session.ts";
import { TransactionItemType, TransactionQueryTypes, type TransactionAPIType, type TransactionType } from "../types/TransactionAPITypes.ts";
import { Transaction } from "../models/Transaction.ts";
import { SubStack } from "../models/SubStack.ts";
export const router = express.Router();

router.post("/transaction", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: TransactionAPIType = req.body;
        if (data.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else if(data.transactionType !== TransactionItemType.INITIAL_FUND && data.amount > await SubStack.getBalance(data.fromIdentifier)) {
            throw new HTMLStatusError("Bad Request", 400);
        } else {
            const transaction = new Transaction(data);
            await Audit.create(`Saved Transaction $${data.amount}: ${data.fromIdentifier} to ${data.toIdentifier}.`, data.session);
            JSONResponse.creationSuccess(req, res, 'Created', transaction as unknown as JSON);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});
router.get("/transactions", async (req, res) => {
    try {
        const session = getSession(req);
        const fromIdentifier = req.query.fromIdentifier as string | undefined;
        const stackID = req.query.stackID as string | undefined;
        if (!fromIdentifier && !stackID) {
            throw new HTMLStatusError("Missing required data", 400);
        }
        let transactions: Array<Omit<TransactionType, "processedOn" | "fromID" | "toID">> | undefined;
        if (fromIdentifier) {
            transactions = await Transaction.getTransactions(fromIdentifier, TransactionQueryTypes.SUBSTACK);
        } else if (stackID) {
            transactions = await Transaction.getTransactions(await SubStack.getParentStack(stackID), TransactionQueryTypes.STACK);
        }
        await Audit.create(`Listing Transactions for ${fromIdentifier ?? `stack ${stackID}`}`, session);
        JSONResponse.goodToGo(req, res, 'OK', transactions as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});
router.put("/transaction", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: TransactionAPIType = req.body;
        if (data.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else {
            await Audit.create("Transaction Event", data.session);
            JSONResponse.updateSuccess(req, res, 'Accepted', null);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});
router.delete("/transaction", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: TransactionAPIType = req.body;
        if (data.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else {
            await Audit.create("Transaction Event", data.session);
            JSONResponse.noContent(req, res, 'No Content', null);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

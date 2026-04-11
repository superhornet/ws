import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
import { Audit } from "../models/Audit.ts";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
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
            const transaction = await Transaction.create(data);
            JSONResponse.creationSuccess(req, res, 'Created', transaction as unknown as JSON);
            new Audit(`Saved Transaction $${data.amount}: ${data.fromIdentifier} to ${data.toIdentifier}.`, data.session);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});
router.get("/transactions", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: TransactionAPIType = req.body;
        if (data.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else {
            let transactions: Array<Omit<TransactionType, "processedOn" | "fromID" | "toID">> | undefined;
            if(data.fromIdentifier){
                transactions = await Transaction.getTransactions(data.fromIdentifier, TransactionQueryTypes.SUBSTACK);
            }else if(data.stackID){
                transactions = await Transaction.getTransactions(await SubStack.getParentStack(data.stackID), TransactionQueryTypes.STACK)
            }
            JSONResponse.goodToGo(req, res, 'OK', transactions as unknown as JSON);
            new Audit(`Listing Transactions for ${data.fromIdentifier}`, data.session);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});
router.put("/transaction", (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: TransactionAPIType = req.body;
        if (data.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else {
            JSONResponse.updateSuccess(req, res, 'Accepted', null);
            new Audit("Transaction Event", data.session);
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
            JSONResponse.noContent(req, res, 'No Content', null);
            new Audit("Transaction Event", data.session);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

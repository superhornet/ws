import * as express from "express";
import JSONResponse from "../libs/JSONResponse.js";
import { Audit } from "../models/Audit.js";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.js";
import { TransactionItemType, TransactionQueryTypes } from "../types/TransactionAPITypes.js";
import { Transaction } from "../models/Transaction.js";
import { SubStack } from "../models/SubStack.js";
export const router = express.Router();
router.post("/transaction", (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data = req.body;
        if (data.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        else if (data.transactionType !== TransactionItemType.INITIAL_FUND && data.amount > SubStack.getBalance(data.fromIdentifier)) {
            throw new HTMLStatusError("Bad Request", 400);
        }
        else {
            const transaction = new Transaction(data);
            JSONResponse.creationSuccess(req, res, 'Created', transaction);
            new Audit(`Saved Transaction $${data.amount}: ${data.fromIdentifier} to ${data.toIdentifier}.`, data.session);
        }
    }
    catch (error) {
        processError(req, res, error);
    }
});
router.get("/transactions", (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data = req.body;
        if (data.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        else {
            let transactions;
            if (data.fromIdentifier) {
                transactions = Transaction.getTransactions(data.fromIdentifier, TransactionQueryTypes.SUBSTACK);
            }
            else if (data.stackID) {
                transactions = Transaction.getTransactions(SubStack.getParentStack(data.stackID), TransactionQueryTypes.STACK);
            }
            JSONResponse.goodToGo(req, res, 'OK', transactions);
            new Audit(`Listing Transactions for ${data.fromIdentifier}`, data.session);
        }
    }
    catch (error) {
        processError(req, res, error);
    }
});
router.get("/transactions", (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
    }
    catch (error) {
        processError(req, res, error);
    }
});
router.put("/transaction", (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data = req.body;
        if (data.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        else {
            JSONResponse.updateSuccess(req, res, 'Accepted', null);
            new Audit("Transaction Event", data.session);
        }
    }
    catch (error) {
        processError(req, res, error);
    }
});
router.delete("/transaction", (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data = req.body;
        if (data.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        else {
            JSONResponse.noContent(req, res, 'No Content', null);
            new Audit("Transaction Event", data.session);
        }
    }
    catch (error) {
        processError(req, res, error);
    }
});
//# sourceMappingURL=TransactionController.js.map
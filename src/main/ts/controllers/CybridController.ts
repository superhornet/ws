import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
import { Audit } from "../models/Audit.ts";
import { Cybrid } from "../models/Cybrid.ts";
import type { CybridAPIType, FiatTransferRequest } from "../types/CybridAPITypes.ts";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";

export const router = express.Router();

// --- Customers ---

router.post("/cybrid/customer", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: CybridAPIType = req.body;
        if (!data.session) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        new Audit("POST /api/cybrid/customer", data.session);
        const customer = await Cybrid.createCustomer(req.body);
        JSONResponse.creationSuccess(req, res, "Customer created", customer as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/customer", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: CybridAPIType = req.body;
        if (!data.session) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        new Audit(`GET /api/cybrid/customer/${data.identifier}`, data.session);
        const customer = await Cybrid.getCustomer(data.identifier);
        JSONResponse.goodToGo(req, res, "OK", customer as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/customers", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: CybridAPIType = req.body;
        if (!data.session) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        new Audit("GET /api/cybrid/customers", data.session);
        const customers = await Cybrid.listCustomers();
        JSONResponse.goodToGo(req, res, "OK", customers as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Accounts ---

router.post("/cybrid/account", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: CybridAPIType = req.body;
        if (!data.session) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        new Audit("POST /api/cybrid/account", data.session);
        const account = await Cybrid.createAccount(req.body);
        JSONResponse.creationSuccess(req, res, "Account created", account as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/account", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: CybridAPIType = req.body;
        if (!data.session) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        new Audit(`GET /api/cybrid/account/${data.identifier}`, data.session);
        const account = await Cybrid.getAccount(data.identifier);
        JSONResponse.goodToGo(req, res, "OK", account as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/accounts", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: CybridAPIType = req.body;
        if (!data.session) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        new Audit("GET /api/cybrid/accounts", data.session);
        const customerGuid = req.query.customer_guid as string | undefined;
        const accounts = await Cybrid.listAccounts(customerGuid);
        JSONResponse.goodToGo(req, res, "OK", accounts as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Quotes ---

router.post("/cybrid/quote", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: CybridAPIType = req.body;
        if (!data.session) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        new Audit("POST /api/cybrid/quote", data.session);
        const quote = await Cybrid.createQuote(req.body);
        JSONResponse.creationSuccess(req, res, "Quote created", quote as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/quote", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: CybridAPIType = req.body;
        if (!data.session) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        new Audit(`GET /api/cybrid/quote/${data.identifier}`, data.session);
        const quote = await Cybrid.getQuote(data.identifier);
        JSONResponse.goodToGo(req, res, "OK", quote as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Trades ---

router.post("/cybrid/trade", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: CybridAPIType = req.body;
        if (!data.session) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        new Audit("POST /api/cybrid/trade", data.session);
        const trade = await Cybrid.createTrade(req.body);
        JSONResponse.creationSuccess(req, res, "Trade created", trade as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/trade", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: CybridAPIType = req.body;
        if (!data.session) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        new Audit(`GET /api/cybrid/trade/${data.identifier}`, data.session);
        const trade = await Cybrid.getTrade(data.identifier);
        JSONResponse.goodToGo(req, res, "OK", trade as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/trades", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: CybridAPIType = req.body;
        if (!data.session) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        new Audit("GET /api/cybrid/trades", data.session);
        const customerGuid = req.query.customer_guid as string | undefined;
        const trades = await Cybrid.listTrades(customerGuid);
        JSONResponse.goodToGo(req, res, "OK", trades as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Transfers ---

router.post("/cybrid/transfer", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: CybridAPIType = req.body;
        if (!data.session) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        new Audit("POST /api/cybrid/transfer", data.session);
        const transfer = await Cybrid.createTransfer(req.body);
        JSONResponse.creationSuccess(req, res, "Transfer created", transfer as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/transfer", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: CybridAPIType = req.body;
        if (!data.session) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        new Audit(`GET /api/cybrid/transfer/${data.identifier}`, data.session);
        const transfer = await Cybrid.getTransfer(data.identifier);
        JSONResponse.goodToGo(req, res, "OK", transfer as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/transfers", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: CybridAPIType = req.body;
        if (!data.session) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        new Audit("GET /api/cybrid/transfers", data.session);
        const customerGuid = req.query.customer_guid as string | undefined;
        const transfers = await Cybrid.listTransfers(customerGuid);
        JSONResponse.goodToGo(req, res, "OK", transfers as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Fiat Book Transfer (customer-to-customer) ---

router.post("/cybrid/fiat-transfer", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: FiatTransferRequest = req.body;
        if (!data.session) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        if (!data.source_account_guid || !data.destination_account_guid) {
            throw new HTMLStatusError("Source and destination account GUIDs are required", 400);
        }
        if (!data.amount || data.amount <= 0) {
            throw new HTMLStatusError("Amount must be a positive number", 400);
        }
        if (!Number.isInteger(data.amount) || !Number.isSafeInteger(data.amount)) {
            throw new HTMLStatusError("Amount must be a safe integer (in cents)", 400);
        }
        if (data.amount > 5_000_00) {
            throw new HTMLStatusError("Amount exceeds maximum transfer limit of $5,000", 400);
        }
        new Audit("POST /api/cybrid/fiat-transfer", data.session);
        const transfer = await Cybrid.transferFiat(
            data.source_account_guid,
            data.destination_account_guid,
            data.amount,
            data.asset,
        );
        JSONResponse.creationSuccess(req, res, "Fiat transfer created", transfer as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Identity Verification ---

router.post("/cybrid/identity-verification", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: CybridAPIType = req.body;
        if (!data.session) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        new Audit("POST /api/cybrid/identity-verification", data.session);
        const verification = await Cybrid.createIdentityVerification(req.body);
        JSONResponse.creationSuccess(req, res, "Identity verification created", verification as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/identity-verification", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: CybridAPIType = req.body;
        if (!data.session) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        new Audit(`GET /api/cybrid/identity-verification/${data.identifier}`, data.session);
        const verification = await Cybrid.getIdentityVerification(data.identifier);
        JSONResponse.goodToGo(req, res, "OK", verification as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

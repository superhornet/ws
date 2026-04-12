import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
import { Audit } from "../models/Audit.ts";
import { Cybrid } from "../models/Cybrid.ts";
import type { CybridAPIType, FiatTransferRequest } from "../types/CybridAPITypes.ts";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";

export const router = express.Router();

function getSession(req: express.Request): string {
    const session = req.headers["x-session"] as string | undefined;
    if (!session) {
        throw new HTMLStatusError("Session ID Required", 403);
    }
    return session;
}

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

router.get("/cybrid/customer/:customer_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = req.params.customer_guid;
        if (!customerGuid) {
            throw new HTMLStatusError("Customer GUID is required", 400);
        }
        new Audit(`GET /api/cybrid/customer/${customerGuid}`, session);
        const includePii = req.query.include_pii === "true";
        const customer = await Cybrid.getCustomer(customerGuid, includePii);
        JSONResponse.goodToGo(req, res, "OK", customer as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/customers", async (req, res) => {
    try {
        const session = getSession(req);
        new Audit("GET /api/cybrid/customers", session);
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

router.get("/cybrid/account/:account_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const accountGuid = req.params.account_guid;
        if (!accountGuid) {
            throw new HTMLStatusError("Account GUID is required", 400);
        }
        new Audit(`GET /api/cybrid/account/${accountGuid}`, session);
        const account = await Cybrid.getAccount(accountGuid);
        JSONResponse.goodToGo(req, res, "OK", account as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/accounts", async (req, res) => {
    try {
        const session = getSession(req);
        new Audit("GET /api/cybrid/accounts", session);
        const customerGuid = req.query.customer_guid as string | undefined;
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        const accounts = await Cybrid.listAccounts(customerGuid, page, perPage);
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

router.get("/cybrid/quote/:quote_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const quoteGuid = req.params.quote_guid;
        if (!quoteGuid) {
            throw new HTMLStatusError("Quote GUID is required", 400);
        }
        new Audit(`GET /api/cybrid/quote/${quoteGuid}`, session);
        const quote = await Cybrid.getQuote(quoteGuid);
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

router.get("/cybrid/trade/:trade_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const tradeGuid = req.params.trade_guid;
        if (!tradeGuid) {
            throw new HTMLStatusError("Trade GUID is required", 400);
        }
        new Audit(`GET /api/cybrid/trade/${tradeGuid}`, session);
        const trade = await Cybrid.getTrade(tradeGuid);
        JSONResponse.goodToGo(req, res, "OK", trade as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/trades", async (req, res) => {
    try {
        const session = getSession(req);
        new Audit("GET /api/cybrid/trades", session);
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

router.get("/cybrid/transfer/:transfer_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const transferGuid = req.params.transfer_guid;
        if (!transferGuid) {
            throw new HTMLStatusError("Transfer GUID is required", 400);
        }
        new Audit(`GET /api/cybrid/transfer/${transferGuid}`, session);
        const transfer = await Cybrid.getTransfer(transferGuid);
        JSONResponse.goodToGo(req, res, "OK", transfer as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/transfers", async (req, res) => {
    try {
        const session = getSession(req);
        new Audit("GET /api/cybrid/transfers", session);
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

// --- Symbols ---

router.get("/cybrid/symbols", async (req, res) => {
    try {
        const session = getSession(req);
        new Audit("GET /api/cybrid/symbols", session);
        const symbols = await Cybrid.listSymbols();
        JSONResponse.goodToGo(req, res, "OK", symbols as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/identity-verification/:verification_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const verificationGuid = req.params.verification_guid;
        if (!verificationGuid) {
            throw new HTMLStatusError("Verification GUID is required", 400);
        }
        new Audit(`GET /api/cybrid/identity-verification/${verificationGuid}`, session);
        const verification = await Cybrid.getIdentityVerification(verificationGuid);
        JSONResponse.goodToGo(req, res, "OK", verification as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

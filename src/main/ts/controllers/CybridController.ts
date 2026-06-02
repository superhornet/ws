import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
import { Audit } from "../models/Audit.ts";
import { Cybrid } from "../models/Cybrid.ts";
import type { CybridAPIType, FiatTransferRequest } from "../types/CybridAPITypes.ts";
import type {
    PostDepositAddressBankModel,
    PostDepositBankAccountBankModel,
    PostExternalBankAccountBankModel,
    PatchExternalBankAccountBankModel,
    PostExternalWalletBankModel,
    PostWorkflowBankModel,
    PatchCustomerBankModel,
    PatchTransferBankModel,
    PostBankBankModel,
    PatchBankBankModel,
    PostCounterpartyBankModel,
    PostPersonaSessionBankModel,
    PostFileBankModel,
    PostExecutionBankModel,
    PostInvoiceBankModel,
    PostPaymentInstructionBankModel,
    PostPlanBankModel,
} from "../libs/CybridClient.ts";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
import { requireGuid } from "../libs/requestValidation.ts";
import { withIdempotency } from "../libs/withIdempotency.ts";
import { getSession, requireSessionFromBody } from "../libs/session.ts";
import { requireBody } from "../libs/requestValidation.ts";

export const router = express.Router();

// --- Accounts ---

router.post("/cybrid/account", async (req, res) => {
    try {
        requireBody(req);
        const data: CybridAPIType = req.body;
        requireSessionFromBody(data);
        const account = await Cybrid.createAccount(req.body);
        await Audit.logMessage("POST /api/cybrid/account", data.session);
        JSONResponse.creationSuccess(req, res, "Account created", account as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/account/:account_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const accountGuid = req.params.account_guid;
        requireGuid(accountGuid, "Account");
        const account = await Cybrid.getAccount(accountGuid);
        await Audit.logMessage(`GET /api/cybrid/account/${accountGuid}`, session);
        JSONResponse.goodToGo(req, res, "OK", account as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/accounts", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = req.query.customer_guid as string | undefined;
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        const accounts = await Cybrid.listAccounts(customerGuid, page, perPage);
        await Audit.logMessage("GET /api/cybrid/accounts", session);
        JSONResponse.goodToGo(req, res, "OK", accounts as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Assets ---

router.get("/cybrid/assets", async (req, res) => {
    try {
        const session = getSession(req);
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        const code = req.query.code as string | undefined;
        const assets = await Cybrid.listAssets(page, perPage, code);
        await Audit.logMessage("GET /api/cybrid/assets", session);
        JSONResponse.goodToGo(req, res, "OK", assets as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Banks ---

router.post("/cybrid/bank", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as PostBankBankModel & { session?: string };
        requireSessionFromBody(data);
        const bank = await Cybrid.createBank(data);
        await Audit.logMessage("POST /api/cybrid/bank", data.session);
        JSONResponse.creationSuccess(req, res, "Bank created", bank as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/bank/:bank_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const bankGuid = req.params.bank_guid;
        requireGuid(bankGuid, "Bank");
        const bank = await Cybrid.getBank(bankGuid);
        await Audit.logMessage(`GET /api/cybrid/bank/${bankGuid}`, session);
        JSONResponse.goodToGo(req, res, "OK", bank as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/banks", async (req, res) => {
    try {
        const session = getSession(req);
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        const type = req.query.type as string | undefined;
        const banks = await Cybrid.listBanks(page, perPage, type);
        await Audit.logMessage("GET /api/cybrid/banks", session);
        JSONResponse.goodToGo(req, res, "OK", banks as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.patch("/cybrid/bank/:bank_guid", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as PatchBankBankModel & { session?: string };
        requireSessionFromBody(data);
        const bankGuid = req.params.bank_guid;
        requireGuid(bankGuid, "Bank");
        const bank = await Cybrid.updateBank(bankGuid, data);
        await Audit.logMessage(`PATCH /api/cybrid/bank/${bankGuid}`, data.session);
        JSONResponse.goodToGo(req, res, "Bank updated", bank as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Counterparties ---

router.post("/cybrid/counterparty", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as PostCounterpartyBankModel & { session?: string };
        requireSessionFromBody(data);
        const counterparty = await Cybrid.createCounterparty(data);
        await Audit.logMessage("POST /api/cybrid/counterparty", data.session);
        JSONResponse.creationSuccess(req, res, "Counterparty created", counterparty as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/counterparty/:counterparty_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const counterpartyGuid = req.params.counterparty_guid;
        requireGuid(counterpartyGuid, "Counterparty");
        const includePii = req.query.include_pii === "true";
        const counterparty = await Cybrid.getCounterparty(counterpartyGuid, includePii);
        await Audit.logMessage(`GET /api/cybrid/counterparty/${counterpartyGuid}`, session);
        JSONResponse.goodToGo(req, res, "OK", counterparty as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/counterparties", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = req.query.customer_guid as string | undefined;
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        const counterparties = await Cybrid.listCounterparties(customerGuid, page, perPage);
        await Audit.logMessage("GET /api/cybrid/counterparties", session);
        JSONResponse.goodToGo(req, res, "OK", counterparties as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Customers ---

router.post("/cybrid/customer", async (req, res) => {
    try {
        requireBody(req);
        const data: CybridAPIType = req.body;
        requireSessionFromBody(data);
        const customer = await Cybrid.createCustomer(req.body);
        await Audit.logMessage("POST /api/cybrid/customer", data.session);
        JSONResponse.creationSuccess(req, res, "Customer created", customer as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/customer/:customer_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = req.params.customer_guid;
        requireGuid(customerGuid, "Customer");
        const includePii = req.query.include_pii === "true";
        const customer = await Cybrid.getCustomer(customerGuid, includePii);
        await Audit.logMessage(`GET /api/cybrid/customer/${customerGuid}`, session);
        JSONResponse.goodToGo(req, res, "OK", customer as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/customers", async (req, res) => {
    try {
        const session = getSession(req);
        const customers = await Cybrid.listCustomers();
        await Audit.logMessage("GET /api/cybrid/customers", session);
        JSONResponse.goodToGo(req, res, "OK", customers as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.patch("/cybrid/customer/:customer_guid", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as PatchCustomerBankModel & { session?: string };
        requireSessionFromBody(data);
        const customerGuid = req.params.customer_guid;
        requireGuid(customerGuid, "Customer");
        const customer = await Cybrid.updateCustomer(customerGuid, data);
        await Audit.logMessage(`PATCH /api/cybrid/customer/${customerGuid}`, data.session);
        JSONResponse.goodToGo(req, res, "Customer updated", customer as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Deposit Addresses ---

router.post("/cybrid/deposit-address", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as PostDepositAddressBankModel & { session?: string };
        requireSessionFromBody(data);
        const address = await Cybrid.createDepositAddress(data);
        await Audit.logMessage("POST /api/cybrid/deposit-address", data.session);
        JSONResponse.creationSuccess(req, res, "Deposit address created", address as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/deposit-address/:deposit_address_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const depositAddressGuid = req.params.deposit_address_guid;
        requireGuid(depositAddressGuid, "Deposit Address");
        const address = await Cybrid.getDepositAddress(depositAddressGuid);
        await Audit.logMessage(`GET /api/cybrid/deposit-address/${depositAddressGuid}`, session);
        JSONResponse.goodToGo(req, res, "OK", address as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/deposit-addresses", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = req.query.customer_guid as string | undefined;
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        const addresses = await Cybrid.listDepositAddresses(customerGuid, page, perPage);
        await Audit.logMessage("GET /api/cybrid/deposit-addresses", session);
        JSONResponse.goodToGo(req, res, "OK", addresses as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Deposit Bank Accounts ---

router.post("/cybrid/deposit-bank-account", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as PostDepositBankAccountBankModel & { session?: string };
        requireSessionFromBody(data);
        const account = await Cybrid.createDepositBankAccount(data);
        await Audit.logMessage("POST /api/cybrid/deposit-bank-account", data.session);
        JSONResponse.creationSuccess(req, res, "Deposit bank account created", account as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/deposit-bank-account/:deposit_bank_account_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const depositBankAccountGuid = req.params.deposit_bank_account_guid;
        requireGuid(depositBankAccountGuid, "Deposit Bank Account");
        const account = await Cybrid.getDepositBankAccount(depositBankAccountGuid);
        await Audit.logMessage(`GET /api/cybrid/deposit-bank-account/${depositBankAccountGuid}`, session);
        JSONResponse.goodToGo(req, res, "OK", account as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/deposit-bank-accounts", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = req.query.customer_guid as string | undefined;
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        const accounts = await Cybrid.listDepositBankAccounts(customerGuid, page, perPage);
        await Audit.logMessage("GET /api/cybrid/deposit-bank-accounts", session);
        JSONResponse.goodToGo(req, res, "OK", accounts as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Executions ---

router.post("/cybrid/execution", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as PostExecutionBankModel & { session?: string };
        requireSessionFromBody(data);
        const execution = await Cybrid.createExecution(data);
        await Audit.logMessage("POST /api/cybrid/execution", data.session);
        JSONResponse.creationSuccess(req, res, "Execution created", execution as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/execution/:execution_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const executionGuid = req.params.execution_guid;
        requireGuid(executionGuid, "Execution");
        const execution = await Cybrid.getExecution(executionGuid);
        await Audit.logMessage(`GET /api/cybrid/execution/${executionGuid}`, session);
        JSONResponse.goodToGo(req, res, "OK", execution as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/executions", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = req.query.customer_guid as string | undefined;
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        const executions = await Cybrid.listExecutions(customerGuid, page, perPage);
        await Audit.logMessage("GET /api/cybrid/executions", session);
        JSONResponse.goodToGo(req, res, "OK", executions as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- External Bank Accounts ---

router.post("/cybrid/external-bank-account", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as PostExternalBankAccountBankModel & { session?: string };
        requireSessionFromBody(data);
        const account = await Cybrid.createExternalBankAccount(data);
        await Audit.logMessage("POST /api/cybrid/external-bank-account", data.session);
        JSONResponse.creationSuccess(req, res, "External bank account created", account as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/external-bank-account/:external_bank_account_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const externalBankAccountGuid = req.params.external_bank_account_guid;
        requireGuid(externalBankAccountGuid, "External Bank Account");
        const includeBalances = req.query.include_balances === "true";
        const forceBalanceRefresh = req.query.force_balance_refresh === "true";
        const includePii = req.query.include_pii === "true";
        const account = await Cybrid.getExternalBankAccount(
            externalBankAccountGuid,
            includeBalances,
            forceBalanceRefresh,
            includePii,
        );
        await Audit.logMessage(`GET /api/cybrid/external-bank-account/${externalBankAccountGuid}`, session);
        JSONResponse.goodToGo(req, res, "OK", account as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/external-bank-accounts", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = req.query.customer_guid as string | undefined;
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        const accounts = await Cybrid.listExternalBankAccounts(customerGuid, page, perPage);
        await Audit.logMessage("GET /api/cybrid/external-bank-accounts", session);
        JSONResponse.goodToGo(req, res, "OK", accounts as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.patch("/cybrid/external-bank-account/:external_bank_account_guid", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as PatchExternalBankAccountBankModel & { session?: string };
        requireSessionFromBody(data);
        const externalBankAccountGuid = req.params.external_bank_account_guid;
        requireGuid(externalBankAccountGuid, "External Bank Account");
        const account = await Cybrid.patchExternalBankAccount(externalBankAccountGuid, data);
        await Audit.logMessage(`PATCH /api/cybrid/external-bank-account/${externalBankAccountGuid}`, data.session);
        JSONResponse.goodToGo(req, res, "External bank account updated", account as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.delete("/cybrid/external-bank-account/:external_bank_account_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const externalBankAccountGuid = req.params.external_bank_account_guid;
        requireGuid(externalBankAccountGuid, "External Bank Account");
        const account = await Cybrid.deleteExternalBankAccount(externalBankAccountGuid);
        await Audit.logMessage(`DELETE /api/cybrid/external-bank-account/${externalBankAccountGuid}`, session);
        JSONResponse.goodToGo(req, res, "External bank account deleted", account as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- External Wallets ---

router.post("/cybrid/external-wallet", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as PostExternalWalletBankModel & { session?: string };
        requireSessionFromBody(data);
        const wallet = await Cybrid.createExternalWallet(data);
        await Audit.logMessage("POST /api/cybrid/external-wallet", data.session);
        JSONResponse.creationSuccess(req, res, "External wallet created", wallet as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/external-wallet/:external_wallet_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const externalWalletGuid = req.params.external_wallet_guid;
        requireGuid(externalWalletGuid, "External Wallet");
        const wallet = await Cybrid.getExternalWallet(externalWalletGuid);
        await Audit.logMessage(`GET /api/cybrid/external-wallet/${externalWalletGuid}`, session);
        JSONResponse.goodToGo(req, res, "OK", wallet as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/external-wallets", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = req.query.customer_guid as string | undefined;
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        const wallets = await Cybrid.listExternalWallets(customerGuid, page, perPage);
        await Audit.logMessage("GET /api/cybrid/external-wallets", session);
        JSONResponse.goodToGo(req, res, "OK", wallets as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.delete("/cybrid/external-wallet/:external_wallet_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const externalWalletGuid = req.params.external_wallet_guid;
        requireGuid(externalWalletGuid, "External Wallet");
        const wallet = await Cybrid.deleteExternalWallet(externalWalletGuid);
        await Audit.logMessage(`DELETE /api/cybrid/external-wallet/${externalWalletGuid}`, session);
        JSONResponse.goodToGo(req, res, "External wallet deleted", wallet as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Fiat Book Transfer (customer-to-customer) ---

router.post("/cybrid/fiat-transfer", async (req, res) => {
    try {
        requireBody(req);
        const data: FiatTransferRequest = req.body;
        requireSessionFromBody(data);
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
        await withIdempotency(req, res, data.session, "/cybrid/fiat-transfer", async () => {
            const transfer = await Cybrid.transferFiat(
                data.source_account_guid,
                data.destination_account_guid,
                data.amount,
                data.asset,
            );
            await Audit.logMessage("POST /api/cybrid/fiat-transfer", data.session);
            return { code: 201, data: transfer as unknown as JSON, message: "Fiat transfer created" };
        });
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Files ---

router.post("/cybrid/file", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as PostFileBankModel & { session?: string };
        requireSessionFromBody(data);
        const file = await Cybrid.createFile(data);
        await Audit.logMessage("POST /api/cybrid/file", data.session);
        JSONResponse.creationSuccess(req, res, "File created", file as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/file/:file_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const fileGuid = req.params.file_guid;
        requireGuid(fileGuid, "File");
        const includeDownloadUrl = req.query.include_download_url as string | undefined;
        const file = await Cybrid.getFile(fileGuid, includeDownloadUrl);
        await Audit.logMessage(`GET /api/cybrid/file/${fileGuid}`, session);
        JSONResponse.goodToGo(req, res, "OK", file as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/files", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = req.query.customer_guid as string | undefined;
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        const files = await Cybrid.listFiles(customerGuid, page, perPage);
        await Audit.logMessage("GET /api/cybrid/files", session);
        JSONResponse.goodToGo(req, res, "OK", files as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Identity Verification ---

router.post("/cybrid/identity-verification", async (req, res) => {
    try {
        requireBody(req);
        const data: CybridAPIType = req.body;
        requireSessionFromBody(data);
        const verification = await Cybrid.createIdentityVerification(req.body);
        await Audit.logMessage("POST /api/cybrid/identity-verification", data.session);
        JSONResponse.creationSuccess(req, res, "Identity verification created", verification as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/identity-verification/:verification_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const verificationGuid = req.params.verification_guid;
        requireGuid(verificationGuid, "Verification");
        const verification = await Cybrid.getIdentityVerification(verificationGuid);
        await Audit.logMessage(`GET /api/cybrid/identity-verification/${verificationGuid}`, session);
        JSONResponse.goodToGo(req, res, "OK", verification as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/identity-verifications", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = req.query.customer_guid as string | undefined;
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        const verifications = await Cybrid.listIdentityVerifications(customerGuid, page, perPage);
        await Audit.logMessage("GET /api/cybrid/identity-verifications", session);
        JSONResponse.goodToGo(req, res, "OK", verifications as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Invoices ---

router.post("/cybrid/invoice", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as PostInvoiceBankModel & { session?: string };
        requireSessionFromBody(data);
        const invoice = await Cybrid.createInvoice(data);
        await Audit.logMessage("POST /api/cybrid/invoice", data.session);
        JSONResponse.creationSuccess(req, res, "Invoice created", invoice as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/invoice/:invoice_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const invoiceGuid = req.params.invoice_guid;
        requireGuid(invoiceGuid, "Invoice");
        const invoice = await Cybrid.getInvoice(invoiceGuid);
        await Audit.logMessage(`GET /api/cybrid/invoice/${invoiceGuid}`, session);
        JSONResponse.goodToGo(req, res, "OK", invoice as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/invoices", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = req.query.customer_guid as string | undefined;
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        const invoices = await Cybrid.listInvoices(customerGuid, page, perPage);
        await Audit.logMessage("GET /api/cybrid/invoices", session);
        JSONResponse.goodToGo(req, res, "OK", invoices as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.delete("/cybrid/invoice/:invoice_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const invoiceGuid = req.params.invoice_guid;
        requireGuid(invoiceGuid, "Invoice");
        const invoice = await Cybrid.cancelInvoice(invoiceGuid);
        await Audit.logMessage(`DELETE /api/cybrid/invoice/${invoiceGuid}`, session);
        JSONResponse.goodToGo(req, res, "Invoice cancelled", invoice as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Payment Instructions ---

router.post("/cybrid/payment-instruction", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as PostPaymentInstructionBankModel & { session?: string };
        requireSessionFromBody(data);
        const instruction = await Cybrid.createPaymentInstruction(data);
        await Audit.logMessage("POST /api/cybrid/payment-instruction", data.session);
        JSONResponse.creationSuccess(req, res, "Payment instruction created", instruction as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/payment-instruction/:payment_instruction_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const paymentInstructionGuid = req.params.payment_instruction_guid;
        requireGuid(paymentInstructionGuid, "Payment Instruction");
        const instruction = await Cybrid.getPaymentInstruction(paymentInstructionGuid);
        await Audit.logMessage(`GET /api/cybrid/payment-instruction/${paymentInstructionGuid}`, session);
        JSONResponse.goodToGo(req, res, "OK", instruction as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/payment-instructions", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = req.query.customer_guid as string | undefined;
        const invoiceGuid = req.query.invoice_guid as string | undefined;
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        const instructions = await Cybrid.listPaymentInstructions(customerGuid, invoiceGuid, page, perPage);
        await Audit.logMessage("GET /api/cybrid/payment-instructions", session);
        JSONResponse.goodToGo(req, res, "OK", instructions as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Persona Sessions ---

router.post("/cybrid/persona-session", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as PostPersonaSessionBankModel & { session?: string };
        requireSessionFromBody(data);
        const personaSession = await Cybrid.createPersonaSession(data);
        await Audit.logMessage("POST /api/cybrid/persona-session", data.session);
        JSONResponse.creationSuccess(req, res, "Persona session created", personaSession as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Plans ---

router.post("/cybrid/plan", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as PostPlanBankModel & { session?: string };
        requireSessionFromBody(data);
        const plan = await Cybrid.createPlan(data);
        await Audit.logMessage("POST /api/cybrid/plan", data.session);
        JSONResponse.creationSuccess(req, res, "Plan created", plan as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/plan/:plan_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const planGuid = req.params.plan_guid;
        requireGuid(planGuid, "Plan");
        const plan = await Cybrid.getPlan(planGuid);
        await Audit.logMessage(`GET /api/cybrid/plan/${planGuid}`, session);
        JSONResponse.goodToGo(req, res, "OK", plan as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/plans", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = req.query.customer_guid as string | undefined;
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        const plans = await Cybrid.listPlans(customerGuid, page, perPage);
        await Audit.logMessage("GET /api/cybrid/plans", session);
        JSONResponse.goodToGo(req, res, "OK", plans as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Prices ---

router.get("/cybrid/prices", async (req, res) => {
    try {
        const session = getSession(req);
        const symbol = req.query.symbol as string | undefined;
        const prices = await Cybrid.listPrices(symbol);
        await Audit.logMessage("GET /api/cybrid/prices", session);
        JSONResponse.goodToGo(req, res, "OK", prices as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Quotes ---

router.post("/cybrid/quote", async (req, res) => {
    try {
        requireBody(req);
        const data: CybridAPIType = req.body;
        requireSessionFromBody(data);
        await withIdempotency(req, res, data.session, "/cybrid/quote", async () => {
            const quote = await Cybrid.createQuote(req.body);
            await Audit.logMessage("POST /api/cybrid/quote", data.session);
            return { code: 201, data: quote as unknown as JSON, message: "Quote created" };
        });
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/quote/:quote_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const quoteGuid = req.params.quote_guid;
        requireGuid(quoteGuid, "Quote");
        const quote = await Cybrid.getQuote(quoteGuid);
        await Audit.logMessage(`GET /api/cybrid/quote/${quoteGuid}`, session);
        JSONResponse.goodToGo(req, res, "OK", quote as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/quotes", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = req.query.customer_guid as string | undefined;
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        const quotes = await Cybrid.listQuotes(customerGuid, page, perPage);
        await Audit.logMessage("GET /api/cybrid/quotes", session);
        JSONResponse.goodToGo(req, res, "OK", quotes as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Symbols ---

router.get("/cybrid/symbols", async (req, res) => {
    try {
        const session = getSession(req);
        const symbols = await Cybrid.listSymbols();
        await Audit.logMessage("GET /api/cybrid/symbols", session);
        JSONResponse.goodToGo(req, res, "OK", symbols as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Trades ---

router.post("/cybrid/trade", async (req, res) => {
    try {
        requireBody(req);
        const data: CybridAPIType = req.body;
        requireSessionFromBody(data);
        await withIdempotency(req, res, data.session, "/cybrid/trade", async () => {
            const trade = await Cybrid.createTrade(req.body);
            await Audit.logMessage("POST /api/cybrid/trade", data.session);
            return { code: 201, data: trade as unknown as JSON, message: "Trade created" };
        });
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/trade/:trade_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const tradeGuid = req.params.trade_guid;
        requireGuid(tradeGuid, "Trade");
        const trade = await Cybrid.getTrade(tradeGuid);
        await Audit.logMessage(`GET /api/cybrid/trade/${tradeGuid}`, session);
        JSONResponse.goodToGo(req, res, "OK", trade as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/trades", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = req.query.customer_guid as string | undefined;
        const trades = await Cybrid.listTrades(customerGuid);
        await Audit.logMessage("GET /api/cybrid/trades", session);
        JSONResponse.goodToGo(req, res, "OK", trades as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Transfers ---

router.post("/cybrid/transfer", async (req, res) => {
    try {
        requireBody(req);
        const data: CybridAPIType = req.body;
        requireSessionFromBody(data);
        await withIdempotency(req, res, data.session, "/cybrid/transfer", async () => {
            const transfer = await Cybrid.createTransfer(req.body);
            await Audit.logMessage("POST /api/cybrid/transfer", data.session);
            return { code: 201, data: transfer as unknown as JSON, message: "Transfer created" };
        });
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/transfer/:transfer_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const transferGuid = req.params.transfer_guid;
        requireGuid(transferGuid, "Transfer");
        const transfer = await Cybrid.getTransfer(transferGuid);
        await Audit.logMessage(`GET /api/cybrid/transfer/${transferGuid}`, session);
        JSONResponse.goodToGo(req, res, "OK", transfer as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/transfers", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = req.query.customer_guid as string | undefined;
        const transfers = await Cybrid.listTransfers(customerGuid);
        await Audit.logMessage("GET /api/cybrid/transfers", session);
        JSONResponse.goodToGo(req, res, "OK", transfers as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.patch("/cybrid/transfer/:transfer_guid", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as PatchTransferBankModel & { session?: string };
        requireSessionFromBody(data);
        const transferGuid = req.params.transfer_guid;
        requireGuid(transferGuid, "Transfer");
        const transfer = await Cybrid.updateTransfer(transferGuid, data);
        await Audit.logMessage(`PATCH /api/cybrid/transfer/${transferGuid}`, data.session);
        JSONResponse.goodToGo(req, res, "Transfer updated", transfer as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Workflows ---

router.post("/cybrid/workflow", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as PostWorkflowBankModel & { session?: string };
        requireSessionFromBody(data);
        const workflow = await Cybrid.createWorkflow(data);
        await Audit.logMessage("POST /api/cybrid/workflow", data.session);
        JSONResponse.creationSuccess(req, res, "Workflow created", workflow as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/workflow/:workflow_guid", async (req, res) => {
    try {
        const session = getSession(req);
        const workflowGuid = req.params.workflow_guid;
        requireGuid(workflowGuid, "Workflow");
        const workflow = await Cybrid.getWorkflow(workflowGuid);
        await Audit.logMessage(`GET /api/cybrid/workflow/${workflowGuid}`, session);
        JSONResponse.goodToGo(req, res, "OK", workflow as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/workflows", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = req.query.customer_guid as string | undefined;
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        const workflows = await Cybrid.listWorkflows(customerGuid, page, perPage);
        await Audit.logMessage("GET /api/cybrid/workflows", session);
        JSONResponse.goodToGo(req, res, "OK", workflows as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});


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
    PostCounterpartyBankModel,
    PostPersonaSessionBankModel,
    PostFileBankModel,
    PostExecutionBankModel,
    PostInvoiceBankModel,
    PostPaymentInstructionBankModel,
    PostPlanBankModel,
    PostAccountBankModel,
    PostQuoteBankModel,
    PostTradeBankModel,
    PostTransferBankModel,
    PostIdentityVerificationBankModel,
} from "../libs/CybridClient.ts";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
import { requireGuid } from "../libs/requestValidation.ts";
import { withIdempotency } from "../libs/withIdempotency.ts";
import { getSession, requireSessionFromBody } from "../libs/session.ts";
import { requireBody } from "../libs/requestValidation.ts";
import {
    requireCustomerGuid,
    requireUnboundUser,
    bindCustomer,
    assertOwnedByCustomer,
    requireOwnCustomerGuid,
    assertOwns,
} from "../libs/cybridAuth.ts";

export const router = express.Router();

/**
 * Every `/api/cybrid/*` resource is owned by a Cybrid customer. Authorization
 * derives the caller's customer from their session-bound user
 * (`requireCustomerGuid`) and asserts the targeted resource belongs to it, rather
 * than trusting client-supplied GUIDs. Three shapes recur:
 *   - list/create carrying a `customer_guid`  → `requireOwnCustomerGuid` forces the caller's own
 *   - read/patch/delete a resource by GUID     → fetch it, `assertOwnedByCustomer` on its `customer_guid`
 *   - create/act hanging off another resource  → `assertOwns` resolves that parent to its customer
 * Platform-admin bank routes are denied to end-user sessions outright; market
 * data (symbols/assets/prices) is customer-agnostic and only requires a session.
 */

const FORBIDDEN = () => new HTMLStatusError("Forbidden", 403);

// --- Accounts ---

router.post("/cybrid/account", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as PostAccountBankModel & { session?: string };
        requireSessionFromBody(data);
        const customerGuid = await requireCustomerGuid(req);
        data.customer_guid = requireOwnCustomerGuid(customerGuid, data.customer_guid);
        await Audit.logMessage("POST /api/cybrid/account", data.session);
        const account = await Cybrid.createAccount(data);
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
        const customerGuid = await requireCustomerGuid(req);
        await Audit.logMessage(`GET /api/cybrid/account/${accountGuid}`, session);
        const account = await Cybrid.getAccount(accountGuid);
        assertOwnedByCustomer(customerGuid, account.customer_guid);
        JSONResponse.goodToGo(req, res, "OK", account as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/accounts", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = requireOwnCustomerGuid(await requireCustomerGuid(req), req.query.customer_guid as string | undefined);
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        await Audit.logMessage("GET /api/cybrid/accounts", session);
        const accounts = await Cybrid.listAccounts(customerGuid, page, perPage);
        JSONResponse.goodToGo(req, res, "OK", accounts as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Assets (market data: session-only) ---

router.get("/cybrid/assets", async (req, res) => {
    try {
        const session = getSession(req);
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        const code = req.query.code as string | undefined;
        await Audit.logMessage("GET /api/cybrid/assets", session);
        const assets = await Cybrid.listAssets(page, perPage, code);
        JSONResponse.goodToGo(req, res, "OK", assets as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Banks (platform-admin: denied to end-user sessions) ---

router.post("/cybrid/bank", (req, res) => processError(req, res, FORBIDDEN()));
router.get("/cybrid/bank/:bank_guid", (req, res) => processError(req, res, FORBIDDEN()));
router.get("/cybrid/banks", (req, res) => processError(req, res, FORBIDDEN()));
router.patch("/cybrid/bank/:bank_guid", (req, res) => processError(req, res, FORBIDDEN()));

// --- Counterparties ---

router.post("/cybrid/counterparty", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as PostCounterpartyBankModel & { session?: string };
        requireSessionFromBody(data);
        const customerGuid = await requireCustomerGuid(req);
        data.customer_guid = requireOwnCustomerGuid(customerGuid, data.customer_guid);
        await Audit.logMessage("POST /api/cybrid/counterparty", data.session);
        const counterparty = await Cybrid.createCounterparty(data);
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
        const customerGuid = await requireCustomerGuid(req);
        const includePii = req.query.include_pii === "true";
        await Audit.logMessage(`GET /api/cybrid/counterparty/${counterpartyGuid}`, session);
        const counterparty = await Cybrid.getCounterparty(counterpartyGuid, includePii);
        assertOwnedByCustomer(customerGuid, counterparty.customer_guid);
        JSONResponse.goodToGo(req, res, "OK", counterparty as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/counterparties", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = requireOwnCustomerGuid(await requireCustomerGuid(req), req.query.customer_guid as string | undefined);
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        await Audit.logMessage("GET /api/cybrid/counterparties", session);
        const counterparties = await Cybrid.listCounterparties(customerGuid, page, perPage);
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
        // Establish the user->customer binding: the session must be a signed-up
        // (bound) user without an existing customer, and the returned guid is
        // stamped onto that user so later requests can be authorized against it.
        const actingUser = await requireUnboundUser(req);
        await Audit.logMessage("POST /api/cybrid/customer", data.session);
        const customer = await Cybrid.createCustomer(req.body);
        if (!customer.guid) {
            throw new HTMLStatusError("Customer creation failed", 500);
        }
        await bindCustomer(actingUser, customer.guid);
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
        assertOwnedByCustomer(await requireCustomerGuid(req), customerGuid);
        const includePii = req.query.include_pii === "true";
        await Audit.logMessage(`GET /api/cybrid/customer/${customerGuid}`, session);
        const customer = await Cybrid.getCustomer(customerGuid, includePii);
        JSONResponse.goodToGo(req, res, "OK", customer as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// Enumerating every customer in the bank is never a legitimate end-user action.
router.get("/cybrid/customers", (req, res) => processError(req, res, FORBIDDEN()));

router.patch("/cybrid/customer/:customer_guid", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as PatchCustomerBankModel & { session?: string };
        requireSessionFromBody(data);
        const customerGuid = req.params.customer_guid;
        requireGuid(customerGuid, "Customer");
        assertOwnedByCustomer(await requireCustomerGuid(req), customerGuid);
        await Audit.logMessage(`PATCH /api/cybrid/customer/${customerGuid}`, data.session);
        const customer = await Cybrid.updateCustomer(customerGuid, data);
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
        const customerGuid = await requireCustomerGuid(req);
        requireGuid(data.account_guid, "Account");
        await assertOwns(customerGuid, () => Cybrid.getAccount(data.account_guid));
        await Audit.logMessage("POST /api/cybrid/deposit-address", data.session);
        const address = await Cybrid.createDepositAddress(data);
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
        const customerGuid = await requireCustomerGuid(req);
        await Audit.logMessage(`GET /api/cybrid/deposit-address/${depositAddressGuid}`, session);
        const address = await Cybrid.getDepositAddress(depositAddressGuid);
        assertOwnedByCustomer(customerGuid, address.customer_guid);
        JSONResponse.goodToGo(req, res, "OK", address as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/deposit-addresses", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = requireOwnCustomerGuid(await requireCustomerGuid(req), req.query.customer_guid as string | undefined);
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        await Audit.logMessage("GET /api/cybrid/deposit-addresses", session);
        const addresses = await Cybrid.listDepositAddresses(customerGuid, page, perPage);
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
        const customerGuid = await requireCustomerGuid(req);
        data.customer_guid = requireOwnCustomerGuid(customerGuid, data.customer_guid);
        await Audit.logMessage("POST /api/cybrid/deposit-bank-account", data.session);
        const account = await Cybrid.createDepositBankAccount(data);
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
        const customerGuid = await requireCustomerGuid(req);
        await Audit.logMessage(`GET /api/cybrid/deposit-bank-account/${depositBankAccountGuid}`, session);
        const account = await Cybrid.getDepositBankAccount(depositBankAccountGuid);
        assertOwnedByCustomer(customerGuid, account.customer_guid);
        JSONResponse.goodToGo(req, res, "OK", account as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/deposit-bank-accounts", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = requireOwnCustomerGuid(await requireCustomerGuid(req), req.query.customer_guid as string | undefined);
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        await Audit.logMessage("GET /api/cybrid/deposit-bank-accounts", session);
        const accounts = await Cybrid.listDepositBankAccounts(customerGuid, page, perPage);
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
        const customerGuid = await requireCustomerGuid(req);
        requireGuid(data.plan_guid, "Plan");
        await assertOwns(customerGuid, () => Cybrid.getPlan(data.plan_guid));
        await Audit.logMessage("POST /api/cybrid/execution", data.session);
        const execution = await Cybrid.createExecution(data);
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
        const customerGuid = await requireCustomerGuid(req);
        await Audit.logMessage(`GET /api/cybrid/execution/${executionGuid}`, session);
        const execution = await Cybrid.getExecution(executionGuid);
        assertOwnedByCustomer(customerGuid, execution.customer_guid);
        JSONResponse.goodToGo(req, res, "OK", execution as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/executions", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = requireOwnCustomerGuid(await requireCustomerGuid(req), req.query.customer_guid as string | undefined);
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        await Audit.logMessage("GET /api/cybrid/executions", session);
        const executions = await Cybrid.listExecutions(customerGuid, page, perPage);
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
        const customerGuid = await requireCustomerGuid(req);
        data.customer_guid = requireOwnCustomerGuid(customerGuid, data.customer_guid);
        await Audit.logMessage("POST /api/cybrid/external-bank-account", data.session);
        const account = await Cybrid.createExternalBankAccount(data);
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
        const customerGuid = await requireCustomerGuid(req);
        const includeBalances = req.query.include_balances === "true";
        const forceBalanceRefresh = req.query.force_balance_refresh === "true";
        const includePii = req.query.include_pii === "true";
        await Audit.logMessage(`GET /api/cybrid/external-bank-account/${externalBankAccountGuid}`, session);
        const account = await Cybrid.getExternalBankAccount(
            externalBankAccountGuid,
            includeBalances,
            forceBalanceRefresh,
            includePii,
        );
        assertOwnedByCustomer(customerGuid, account.customer_guid);
        JSONResponse.goodToGo(req, res, "OK", account as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/external-bank-accounts", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = requireOwnCustomerGuid(await requireCustomerGuid(req), req.query.customer_guid as string | undefined);
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        await Audit.logMessage("GET /api/cybrid/external-bank-accounts", session);
        const accounts = await Cybrid.listExternalBankAccounts(customerGuid, page, perPage);
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
        const customerGuid = await requireCustomerGuid(req);
        await assertOwns(customerGuid, () => Cybrid.getExternalBankAccount(externalBankAccountGuid));
        await Audit.logMessage(`PATCH /api/cybrid/external-bank-account/${externalBankAccountGuid}`, data.session);
        const account = await Cybrid.patchExternalBankAccount(externalBankAccountGuid, data);
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
        const customerGuid = await requireCustomerGuid(req);
        await assertOwns(customerGuid, () => Cybrid.getExternalBankAccount(externalBankAccountGuid));
        await Audit.logMessage(`DELETE /api/cybrid/external-bank-account/${externalBankAccountGuid}`, session);
        const account = await Cybrid.deleteExternalBankAccount(externalBankAccountGuid);
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
        const customerGuid = await requireCustomerGuid(req);
        data.customer_guid = requireOwnCustomerGuid(customerGuid, data.customer_guid);
        await Audit.logMessage("POST /api/cybrid/external-wallet", data.session);
        const wallet = await Cybrid.createExternalWallet(data);
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
        const customerGuid = await requireCustomerGuid(req);
        await Audit.logMessage(`GET /api/cybrid/external-wallet/${externalWalletGuid}`, session);
        const wallet = await Cybrid.getExternalWallet(externalWalletGuid);
        assertOwnedByCustomer(customerGuid, wallet.customer_guid);
        JSONResponse.goodToGo(req, res, "OK", wallet as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/external-wallets", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = requireOwnCustomerGuid(await requireCustomerGuid(req), req.query.customer_guid as string | undefined);
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        await Audit.logMessage("GET /api/cybrid/external-wallets", session);
        const wallets = await Cybrid.listExternalWallets(customerGuid, page, perPage);
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
        const customerGuid = await requireCustomerGuid(req);
        await assertOwns(customerGuid, () => Cybrid.getExternalWallet(externalWalletGuid));
        await Audit.logMessage(`DELETE /api/cybrid/external-wallet/${externalWalletGuid}`, session);
        const wallet = await Cybrid.deleteExternalWallet(externalWalletGuid);
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
        // Money moves out of the source account, so the caller must own it. The
        // destination may belong to another customer — that is the point of a
        // customer-to-customer book transfer.
        const customerGuid = await requireCustomerGuid(req);
        await assertOwns(customerGuid, () => Cybrid.getAccount(data.source_account_guid));
        await withIdempotency(req, res, data.session, "/cybrid/fiat-transfer", async () => {
            await Audit.logMessage("POST /api/cybrid/fiat-transfer", data.session);
            const transfer = await Cybrid.transferFiat(
                data.source_account_guid,
                data.destination_account_guid,
                data.amount,
                data.asset,
            );
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
        const customerGuid = await requireCustomerGuid(req);
        data.customer_guid = requireOwnCustomerGuid(customerGuid, data.customer_guid);
        await Audit.logMessage("POST /api/cybrid/file", data.session);
        const file = await Cybrid.createFile(data);
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
        const customerGuid = await requireCustomerGuid(req);
        const includeDownloadUrl = req.query.include_download_url as string | undefined;
        await Audit.logMessage(`GET /api/cybrid/file/${fileGuid}`, session);
        const file = await Cybrid.getFile(fileGuid, includeDownloadUrl);
        assertOwnedByCustomer(customerGuid, file.customer_guid);
        JSONResponse.goodToGo(req, res, "OK", file as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/files", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = requireOwnCustomerGuid(await requireCustomerGuid(req), req.query.customer_guid as string | undefined);
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        await Audit.logMessage("GET /api/cybrid/files", session);
        const files = await Cybrid.listFiles(customerGuid, page, perPage);
        JSONResponse.goodToGo(req, res, "OK", files as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Identity Verification ---

router.post("/cybrid/identity-verification", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as PostIdentityVerificationBankModel & { session?: string };
        requireSessionFromBody(data);
        const customerGuid = await requireCustomerGuid(req);
        data.customer_guid = requireOwnCustomerGuid(customerGuid, data.customer_guid);
        await Audit.logMessage("POST /api/cybrid/identity-verification", data.session);
        const verification = await Cybrid.createIdentityVerification(data);
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
        const customerGuid = await requireCustomerGuid(req);
        await Audit.logMessage(`GET /api/cybrid/identity-verification/${verificationGuid}`, session);
        const verification = await Cybrid.getIdentityVerification(verificationGuid);
        assertOwnedByCustomer(customerGuid, verification.customer_guid);
        JSONResponse.goodToGo(req, res, "OK", verification as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/identity-verifications", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = requireOwnCustomerGuid(await requireCustomerGuid(req), req.query.customer_guid as string | undefined);
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        await Audit.logMessage("GET /api/cybrid/identity-verifications", session);
        const verifications = await Cybrid.listIdentityVerifications(customerGuid, page, perPage);
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
        const customerGuid = await requireCustomerGuid(req);
        data.customer_guid = requireOwnCustomerGuid(customerGuid, data.customer_guid);
        await Audit.logMessage("POST /api/cybrid/invoice", data.session);
        const invoice = await Cybrid.createInvoice(data);
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
        const customerGuid = await requireCustomerGuid(req);
        await Audit.logMessage(`GET /api/cybrid/invoice/${invoiceGuid}`, session);
        const invoice = await Cybrid.getInvoice(invoiceGuid);
        assertOwnedByCustomer(customerGuid, invoice.customer_guid);
        JSONResponse.goodToGo(req, res, "OK", invoice as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/invoices", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = requireOwnCustomerGuid(await requireCustomerGuid(req), req.query.customer_guid as string | undefined);
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        await Audit.logMessage("GET /api/cybrid/invoices", session);
        const invoices = await Cybrid.listInvoices(customerGuid, page, perPage);
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
        const customerGuid = await requireCustomerGuid(req);
        await assertOwns(customerGuid, () => Cybrid.getInvoice(invoiceGuid));
        await Audit.logMessage(`DELETE /api/cybrid/invoice/${invoiceGuid}`, session);
        const invoice = await Cybrid.cancelInvoice(invoiceGuid);
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
        const customerGuid = await requireCustomerGuid(req);
        requireGuid(data.invoice_guid, "Invoice");
        await assertOwns(customerGuid, () => Cybrid.getInvoice(data.invoice_guid));
        await Audit.logMessage("POST /api/cybrid/payment-instruction", data.session);
        const instruction = await Cybrid.createPaymentInstruction(data);
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
        const customerGuid = await requireCustomerGuid(req);
        await Audit.logMessage(`GET /api/cybrid/payment-instruction/${paymentInstructionGuid}`, session);
        const instruction = await Cybrid.getPaymentInstruction(paymentInstructionGuid);
        assertOwnedByCustomer(customerGuid, instruction.customer_guid);
        JSONResponse.goodToGo(req, res, "OK", instruction as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/payment-instructions", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = requireOwnCustomerGuid(await requireCustomerGuid(req), req.query.customer_guid as string | undefined);
        const invoiceGuid = req.query.invoice_guid as string | undefined;
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        await Audit.logMessage("GET /api/cybrid/payment-instructions", session);
        const instructions = await Cybrid.listPaymentInstructions(customerGuid, invoiceGuid, page, perPage);
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
        const customerGuid = await requireCustomerGuid(req);
        requireGuid(data.identity_verification_guid, "Verification");
        await assertOwns(customerGuid, () => Cybrid.getIdentityVerification(data.identity_verification_guid));
        await Audit.logMessage("POST /api/cybrid/persona-session", data.session);
        const personaSession = await Cybrid.createPersonaSession(data);
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
        const customerGuid = await requireCustomerGuid(req);
        data.customer_guid = requireOwnCustomerGuid(customerGuid, data.customer_guid);
        await Audit.logMessage("POST /api/cybrid/plan", data.session);
        const plan = await Cybrid.createPlan(data);
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
        const customerGuid = await requireCustomerGuid(req);
        await Audit.logMessage(`GET /api/cybrid/plan/${planGuid}`, session);
        const plan = await Cybrid.getPlan(planGuid);
        assertOwnedByCustomer(customerGuid, plan.customer_guid);
        JSONResponse.goodToGo(req, res, "OK", plan as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/plans", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = requireOwnCustomerGuid(await requireCustomerGuid(req), req.query.customer_guid as string | undefined);
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        await Audit.logMessage("GET /api/cybrid/plans", session);
        const plans = await Cybrid.listPlans(customerGuid, page, perPage);
        JSONResponse.goodToGo(req, res, "OK", plans as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Prices (market data: session-only) ---

router.get("/cybrid/prices", async (req, res) => {
    try {
        const session = getSession(req);
        const symbol = req.query.symbol as string | undefined;
        await Audit.logMessage("GET /api/cybrid/prices", session);
        const prices = await Cybrid.listPrices(symbol);
        JSONResponse.goodToGo(req, res, "OK", prices as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Quotes ---

router.post("/cybrid/quote", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as PostQuoteBankModel & { session?: string };
        requireSessionFromBody(data);
        const customerGuid = await requireCustomerGuid(req);
        data.customer_guid = requireOwnCustomerGuid(customerGuid, data.customer_guid);
        await withIdempotency(req, res, data.session as string, "/cybrid/quote", async () => {
            await Audit.logMessage("POST /api/cybrid/quote", data.session as string);
            const quote = await Cybrid.createQuote(data);
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
        const customerGuid = await requireCustomerGuid(req);
        await Audit.logMessage(`GET /api/cybrid/quote/${quoteGuid}`, session);
        const quote = await Cybrid.getQuote(quoteGuid);
        assertOwnedByCustomer(customerGuid, quote.customer_guid);
        JSONResponse.goodToGo(req, res, "OK", quote as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/quotes", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = requireOwnCustomerGuid(await requireCustomerGuid(req), req.query.customer_guid as string | undefined);
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        await Audit.logMessage("GET /api/cybrid/quotes", session);
        const quotes = await Cybrid.listQuotes(customerGuid, page, perPage);
        JSONResponse.goodToGo(req, res, "OK", quotes as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Symbols (market data: session-only) ---

router.get("/cybrid/symbols", async (req, res) => {
    try {
        const session = getSession(req);
        await Audit.logMessage("GET /api/cybrid/symbols", session);
        const symbols = await Cybrid.listSymbols();
        JSONResponse.goodToGo(req, res, "OK", symbols as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Trades ---

router.post("/cybrid/trade", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as PostTradeBankModel & { session?: string };
        requireSessionFromBody(data);
        const customerGuid = await requireCustomerGuid(req);
        requireGuid(data.quote_guid, "Quote");
        await assertOwns(customerGuid, () => Cybrid.getQuote(data.quote_guid));
        await withIdempotency(req, res, data.session as string, "/cybrid/trade", async () => {
            await Audit.logMessage("POST /api/cybrid/trade", data.session as string);
            const trade = await Cybrid.createTrade(data);
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
        const customerGuid = await requireCustomerGuid(req);
        await Audit.logMessage(`GET /api/cybrid/trade/${tradeGuid}`, session);
        const trade = await Cybrid.getTrade(tradeGuid);
        assertOwnedByCustomer(customerGuid, trade.customer_guid);
        JSONResponse.goodToGo(req, res, "OK", trade as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/trades", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = requireOwnCustomerGuid(await requireCustomerGuid(req), req.query.customer_guid as string | undefined);
        await Audit.logMessage("GET /api/cybrid/trades", session);
        const trades = await Cybrid.listTrades(customerGuid);
        JSONResponse.goodToGo(req, res, "OK", trades as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// --- Transfers ---

router.post("/cybrid/transfer", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as PostTransferBankModel & { session?: string };
        requireSessionFromBody(data);
        const customerGuid = await requireCustomerGuid(req);
        requireGuid(data.quote_guid, "Quote");
        await assertOwns(customerGuid, () => Cybrid.getQuote(data.quote_guid));
        await withIdempotency(req, res, data.session as string, "/cybrid/transfer", async () => {
            await Audit.logMessage("POST /api/cybrid/transfer", data.session as string);
            const transfer = await Cybrid.createTransfer(data);
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
        const customerGuid = await requireCustomerGuid(req);
        await Audit.logMessage(`GET /api/cybrid/transfer/${transferGuid}`, session);
        const transfer = await Cybrid.getTransfer(transferGuid);
        assertOwnedByCustomer(customerGuid, transfer.customer_guid);
        JSONResponse.goodToGo(req, res, "OK", transfer as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/transfers", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = requireOwnCustomerGuid(await requireCustomerGuid(req), req.query.customer_guid as string | undefined);
        await Audit.logMessage("GET /api/cybrid/transfers", session);
        const transfers = await Cybrid.listTransfers(customerGuid);
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
        const customerGuid = await requireCustomerGuid(req);
        await assertOwns(customerGuid, () => Cybrid.getTransfer(transferGuid));
        await Audit.logMessage(`PATCH /api/cybrid/transfer/${transferGuid}`, data.session);
        const transfer = await Cybrid.updateTransfer(transferGuid, data);
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
        const customerGuid = await requireCustomerGuid(req);
        data.customer_guid = requireOwnCustomerGuid(customerGuid, data.customer_guid);
        await Audit.logMessage("POST /api/cybrid/workflow", data.session);
        const workflow = await Cybrid.createWorkflow(data);
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
        const customerGuid = await requireCustomerGuid(req);
        await Audit.logMessage(`GET /api/cybrid/workflow/${workflowGuid}`, session);
        const workflow = await Cybrid.getWorkflow(workflowGuid);
        // WorkflowWithDetails does not always surface customer_guid on its type, so
        // read it defensively; a workflow without one is treated as not-owned.
        assertOwnedByCustomer(customerGuid, (workflow as { customer_guid?: string | null }).customer_guid);
        JSONResponse.goodToGo(req, res, "OK", workflow as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/cybrid/workflows", async (req, res) => {
    try {
        const session = getSession(req);
        const customerGuid = requireOwnCustomerGuid(await requireCustomerGuid(req), req.query.customer_guid as string | undefined);
        const page = req.query.page ? Number(req.query.page) : undefined;
        const perPage = req.query.per_page ? Number(req.query.per_page) : undefined;
        await Audit.logMessage("GET /api/cybrid/workflows", session);
        const workflows = await Cybrid.listWorkflows(customerGuid, page, perPage);
        JSONResponse.goodToGo(req, res, "OK", workflows as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

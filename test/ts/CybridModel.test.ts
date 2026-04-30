import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { HTMLStatusError } from "../../src/main/ts/libs/HTMLStatusError.ts";

// --- Client method mocks ---

type AnyFn = (...args: unknown[]) => Promise<unknown>;
const fn = () => mock.fn<AnyFn>();

// Book transfer
const mockCreateBookTransfer = fn();

// Customers
const mockCreateCustomer = fn();
const mockGetCustomer = fn();
const mockListCustomers = fn();
const mockUpdateCustomer = fn();

// Accounts
const mockCreateAccount = fn();
const mockGetAccount = fn();
const mockListAccounts = fn();

// Quotes
const mockCreateQuote = fn();
const mockGetQuote = fn();
const mockListQuotes = fn();

// Trades
const mockCreateTrade = fn();
const mockGetTrade = fn();
const mockListTrades = fn();

// Transfers
const mockCreateTransfer = fn();
const mockGetTransfer = fn();
const mockListTransfers = fn();
const mockUpdateTransfer = fn();

// Identity verifications
const mockCreateIdentityVerification = fn();
const mockGetIdentityVerification = fn();
const mockListIdentityVerifications = fn();

// Market data
const mockListSymbols = fn();
const mockListAssets = fn();
const mockListPrices = fn();

// Deposit addresses
const mockCreateDepositAddress = fn();
const mockGetDepositAddress = fn();
const mockListDepositAddresses = fn();

// Deposit bank accounts
const mockCreateDepositBankAccount = fn();
const mockGetDepositBankAccount = fn();
const mockListDepositBankAccounts = fn();

// External bank accounts
const mockCreateExternalBankAccount = fn();
const mockGetExternalBankAccount = fn();
const mockListExternalBankAccounts = fn();
const mockPatchExternalBankAccount = fn();
const mockDeleteExternalBankAccount = fn();

// External wallets
const mockCreateExternalWallet = fn();
const mockGetExternalWallet = fn();
const mockListExternalWallets = fn();
const mockDeleteExternalWallet = fn();

// Workflows
const mockCreateWorkflow = fn();
const mockGetWorkflow = fn();
const mockListWorkflows = fn();

// Banks
const mockCreateBank = fn();
const mockGetBank = fn();
const mockListBanks = fn();
const mockUpdateBank = fn();

// Counterparties
const mockCreateCounterparty = fn();
const mockGetCounterparty = fn();
const mockListCounterparties = fn();

// Persona sessions
const mockCreatePersonaSession = fn();

// Files
const mockCreateFile = fn();
const mockGetFile = fn();
const mockListFiles = fn();

// Executions
const mockCreateExecution = fn();
const mockGetExecution = fn();
const mockListExecutions = fn();

// Invoices
const mockCreateInvoice = fn();
const mockGetInvoice = fn();
const mockListInvoices = fn();
const mockCancelInvoice = fn();

// Payment instructions
const mockCreatePaymentInstruction = fn();
const mockGetPaymentInstruction = fn();
const mockListPaymentInstructions = fn();

// Plans
const mockCreatePlan = fn();
const mockGetPlan = fn();
const mockListPlans = fn();

mock.module("../../src/main/ts/libs/CybridClient.ts", {
    namedExports: {
        createBookTransfer: mockCreateBookTransfer,

        createCustomer: mockCreateCustomer,
        getCustomer: mockGetCustomer,
        listCustomers: mockListCustomers,
        updateCustomer: mockUpdateCustomer,

        createAccount: mockCreateAccount,
        getAccount: mockGetAccount,
        listAccounts: mockListAccounts,

        createQuote: mockCreateQuote,
        getQuote: mockGetQuote,
        listQuotes: mockListQuotes,

        createTrade: mockCreateTrade,
        getTrade: mockGetTrade,
        listTrades: mockListTrades,

        createTransfer: mockCreateTransfer,
        getTransfer: mockGetTransfer,
        listTransfers: mockListTransfers,
        updateTransfer: mockUpdateTransfer,

        createIdentityVerification: mockCreateIdentityVerification,
        getIdentityVerification: mockGetIdentityVerification,
        listIdentityVerifications: mockListIdentityVerifications,

        listSymbols: mockListSymbols,
        listAssets: mockListAssets,
        listPrices: mockListPrices,

        createDepositAddress: mockCreateDepositAddress,
        getDepositAddress: mockGetDepositAddress,
        listDepositAddresses: mockListDepositAddresses,

        createDepositBankAccount: mockCreateDepositBankAccount,
        getDepositBankAccount: mockGetDepositBankAccount,
        listDepositBankAccounts: mockListDepositBankAccounts,

        createExternalBankAccount: mockCreateExternalBankAccount,
        getExternalBankAccount: mockGetExternalBankAccount,
        listExternalBankAccounts: mockListExternalBankAccounts,
        patchExternalBankAccount: mockPatchExternalBankAccount,
        deleteExternalBankAccount: mockDeleteExternalBankAccount,

        createExternalWallet: mockCreateExternalWallet,
        getExternalWallet: mockGetExternalWallet,
        listExternalWallets: mockListExternalWallets,
        deleteExternalWallet: mockDeleteExternalWallet,

        createWorkflow: mockCreateWorkflow,
        getWorkflow: mockGetWorkflow,
        listWorkflows: mockListWorkflows,

        createBank: mockCreateBank,
        getBank: mockGetBank,
        listBanks: mockListBanks,
        updateBank: mockUpdateBank,

        createCounterparty: mockCreateCounterparty,
        getCounterparty: mockGetCounterparty,
        listCounterparties: mockListCounterparties,

        createPersonaSession: mockCreatePersonaSession,

        createFile: mockCreateFile,
        getFile: mockGetFile,
        listFiles: mockListFiles,

        createExecution: mockCreateExecution,
        getExecution: mockGetExecution,
        listExecutions: mockListExecutions,

        createInvoice: mockCreateInvoice,
        getInvoice: mockGetInvoice,
        listInvoices: mockListInvoices,
        cancelInvoice: mockCancelInvoice,

        createPaymentInstruction: mockCreatePaymentInstruction,
        getPaymentInstruction: mockGetPaymentInstruction,
        listPaymentInstructions: mockListPaymentInstructions,

        createPlan: mockCreatePlan,
        getPlan: mockGetPlan,
        listPlans: mockListPlans,
    },
});

const { Cybrid } = await import("../../src/main/ts/models/Cybrid.ts");

// --- Helpers ---

function resetAll(mocks: ReadonlyArray<ReturnType<typeof fn>>) {
    for (const m of mocks) {
        m.mock.resetCalls();
        m.mock.mockImplementation(async () => ({}));
    }
}

async function expectBadRequest(promise: Promise<unknown>, messageMatch: RegExp): Promise<void> {
    await assert.rejects(promise, (error: HTMLStatusError) => {
        assert.equal(error.statusCode, 400);
        assert.match(error.message, messageMatch);
        return true;
    });
}

async function expectWrappedError(promise: Promise<unknown>, messageMatch: RegExp): Promise<void> {
    await assert.rejects(promise, (error: HTMLStatusError) => {
        assert.equal(error.statusCode, 500);
        assert.match(error.message, messageMatch);
        return true;
    });
}

// --- transferFiat (existing + extended) ---

describe("Cybrid.transferFiat", () => {
    const mockTransfer = { guid: "transfer-guid-123", transfer_type: "book", state: "completed" };

    beforeEach(() => {
        mockCreateBookTransfer.mock.resetCalls();
        mockCreateBookTransfer.mock.mockImplementation(async () => mockTransfer);
    });

    it("should throw when source account GUID is missing", async () => {
        await expectBadRequest(Cybrid.transferFiat("", "dest-guid", 5000), /Source account GUID/);
    });

    it("should throw when destination account GUID is missing", async () => {
        await expectBadRequest(Cybrid.transferFiat("source-guid", "", 5000), /Destination account GUID/);
    });

    it("should throw when amount is zero", async () => {
        await expectBadRequest(Cybrid.transferFiat("source-guid", "dest-guid", 0), /positive number/);
    });

    it("should throw when amount is negative", async () => {
        await expectBadRequest(Cybrid.transferFiat("source-guid", "dest-guid", -100), /positive number/);
    });

    it("should throw when amount is not an integer", async () => {
        await expectBadRequest(Cybrid.transferFiat("source-guid", "dest-guid", 10.5), /safe integer/);
    });

    it("should throw when amount exceeds the $5,000 cap", async () => {
        await expectBadRequest(Cybrid.transferFiat("source-guid", "dest-guid", 5_000_01), /maximum transfer limit/);
    });

    it("should allow amount exactly at the cap", async () => {
        const result = await Cybrid.transferFiat("src-guid", "dst-guid", 5_000_00);
        assert.equal(result.guid, "transfer-guid-123");
    });

    it("should call CybridClient.createBookTransfer with correct args", async () => {
        const result = await Cybrid.transferFiat("src-guid", "dst-guid", 5000, "USD");

        assert.equal(mockCreateBookTransfer.mock.callCount(), 1);
        const call = mockCreateBookTransfer.mock.calls[0]!;
        assert.deepEqual(call.arguments, ["src-guid", "dst-guid", 5000, "USD"]);
        assert.equal(result.guid, "transfer-guid-123");
    });

    it("should pass undefined asset when not provided", async () => {
        await Cybrid.transferFiat("src-guid", "dst-guid", 1000);
        const call = mockCreateBookTransfer.mock.calls[0]!;
        assert.deepEqual(call.arguments, ["src-guid", "dst-guid", 1000, undefined]);
    });

    it("should wrap non-HTMLStatusError as 500", async () => {
        mockCreateBookTransfer.mock.mockImplementation(async () => {
            throw new Error("network failure");
        });
        await expectWrappedError(Cybrid.transferFiat("src-guid", "dst-guid", 5000), /network failure/);
    });

    it("should re-throw HTMLStatusError from client unchanged", async () => {
        mockCreateBookTransfer.mock.mockImplementation(async () => {
            throw new HTMLStatusError("Quote creation failed: no guid returned", 500);
        });
        await expectWrappedError(Cybrid.transferFiat("src-guid", "dst-guid", 5000), /Quote creation failed/);
    });
});

// --- Customers ---

describe("Cybrid.customers", () => {
    const mockCustomer = { guid: "customer-guid-1", type: "individual", state: "storing" };
    const mockList = { total: 1, page: 0, per_page: 25, objects: [mockCustomer] };

    beforeEach(() => {
        resetAll([mockCreateCustomer, mockGetCustomer, mockListCustomers, mockUpdateCustomer]);
        mockCreateCustomer.mock.mockImplementation(async () => mockCustomer);
        mockGetCustomer.mock.mockImplementation(async () => mockCustomer);
        mockListCustomers.mock.mockImplementation(async () => mockList);
        mockUpdateCustomer.mock.mockImplementation(async () => mockCustomer);
    });

    it("createCustomer forwards the body", async () => {
        const body = { type: "individual" };
        const result = await Cybrid.createCustomer(body as never);
        assert.equal(result.guid, "customer-guid-1");
        assert.deepEqual(mockCreateCustomer.mock.calls[0]!.arguments, [body]);
    });

    it("getCustomer throws 400 when guid is missing", async () => {
        await expectBadRequest(Cybrid.getCustomer(""), /Customer GUID/);
    });

    it("getCustomer forwards guid and default includePii=false", async () => {
        await Cybrid.getCustomer("customer-guid-1");
        assert.deepEqual(mockGetCustomer.mock.calls[0]!.arguments, ["customer-guid-1", false]);
    });

    it("getCustomer passes includePii=true when requested", async () => {
        await Cybrid.getCustomer("customer-guid-1", true);
        assert.deepEqual(mockGetCustomer.mock.calls[0]!.arguments, ["customer-guid-1", true]);
    });

    it("listCustomers forwards paging", async () => {
        await Cybrid.listCustomers(2, 50);
        assert.deepEqual(mockListCustomers.mock.calls[0]!.arguments, [2, 50]);
    });

    it("updateCustomer throws 400 when guid is missing", async () => {
        await expectBadRequest(Cybrid.updateCustomer("", {} as never), /Customer GUID/);
    });

    it("updateCustomer forwards guid and patch body", async () => {
        const patch = { name: { first: "Jane" } };
        await Cybrid.updateCustomer("customer-guid-1", patch as never);
        assert.deepEqual(mockUpdateCustomer.mock.calls[0]!.arguments, ["customer-guid-1", patch]);
    });

    it("createCustomer wraps non-HTMLStatusError as 500", async () => {
        mockCreateCustomer.mock.mockImplementation(async () => {
            throw new Error("boom");
        });
        await expectWrappedError(Cybrid.createCustomer({} as never), /boom/);
    });
});

// --- Accounts ---

describe("Cybrid.accounts", () => {
    const mockAccount = { guid: "acct-1", type: "fiat", asset: "USD", state: "created" };

    beforeEach(() => {
        resetAll([mockCreateAccount, mockGetAccount, mockListAccounts]);
        mockCreateAccount.mock.mockImplementation(async () => mockAccount);
        mockGetAccount.mock.mockImplementation(async () => mockAccount);
        mockListAccounts.mock.mockImplementation(async () => ({ total: 1, page: 0, per_page: 25, objects: [mockAccount] }));
    });

    it("createAccount forwards the body", async () => {
        await Cybrid.createAccount({ type: "fiat" } as never);
        assert.deepEqual(mockCreateAccount.mock.calls[0]!.arguments, [{ type: "fiat" }]);
    });

    it("getAccount throws 400 when guid is missing", async () => {
        await expectBadRequest(Cybrid.getAccount(""), /Account GUID/);
    });

    it("getAccount forwards the guid", async () => {
        const result = await Cybrid.getAccount("acct-1");
        assert.equal(result.guid, "acct-1");
        assert.deepEqual(mockGetAccount.mock.calls[0]!.arguments, ["acct-1"]);
    });

    it("listAccounts forwards customerGuid and paging", async () => {
        await Cybrid.listAccounts("cust-1", 1, 100);
        assert.deepEqual(mockListAccounts.mock.calls[0]!.arguments, ["cust-1", 1, 100]);
    });
});

// --- Quotes ---

describe("Cybrid.quotes", () => {
    const mockQuote = { guid: "quote-1" };

    beforeEach(() => {
        resetAll([mockCreateQuote, mockGetQuote, mockListQuotes]);
        mockCreateQuote.mock.mockImplementation(async () => mockQuote);
        mockGetQuote.mock.mockImplementation(async () => mockQuote);
        mockListQuotes.mock.mockImplementation(async () => ({ total: 1, page: 0, per_page: 25, objects: [mockQuote] }));
    });

    it("createQuote forwards the body", async () => {
        await Cybrid.createQuote({ product_type: "trading" } as never);
        assert.deepEqual(mockCreateQuote.mock.calls[0]!.arguments, [{ product_type: "trading" }]);
    });

    it("getQuote throws 400 when guid is missing", async () => {
        await expectBadRequest(Cybrid.getQuote(""), /Quote GUID/);
    });

    it("getQuote forwards the guid", async () => {
        await Cybrid.getQuote("quote-1");
        assert.deepEqual(mockGetQuote.mock.calls[0]!.arguments, ["quote-1"]);
    });

    it("listQuotes forwards paging and customer", async () => {
        await Cybrid.listQuotes("cust-1", 0, 10);
        assert.deepEqual(mockListQuotes.mock.calls[0]!.arguments, ["cust-1", 0, 10]);
    });
});

// --- Trades ---

describe("Cybrid.trades", () => {
    const mockTrade = { guid: "trade-1" };

    beforeEach(() => {
        resetAll([mockCreateTrade, mockGetTrade, mockListTrades]);
        mockCreateTrade.mock.mockImplementation(async () => mockTrade);
        mockGetTrade.mock.mockImplementation(async () => mockTrade);
        mockListTrades.mock.mockImplementation(async () => ({ total: 1, page: 0, per_page: 25, objects: [mockTrade] }));
    });

    it("createTrade forwards the body", async () => {
        await Cybrid.createTrade({ quote_guid: "q-1" } as never);
        assert.deepEqual(mockCreateTrade.mock.calls[0]!.arguments, [{ quote_guid: "q-1" }]);
    });

    it("getTrade throws 400 when guid is missing", async () => {
        await expectBadRequest(Cybrid.getTrade(""), /Trade GUID/);
    });

    it("getTrade forwards the guid", async () => {
        await Cybrid.getTrade("trade-1");
        assert.deepEqual(mockGetTrade.mock.calls[0]!.arguments, ["trade-1"]);
    });

    it("listTrades forwards the customerGuid", async () => {
        await Cybrid.listTrades("cust-1");
        assert.equal(mockListTrades.mock.calls[0]!.arguments[0], "cust-1");
    });
});

// --- Transfers ---

describe("Cybrid.transfers", () => {
    const mockTransfer = { guid: "transfer-1" };

    beforeEach(() => {
        resetAll([mockCreateTransfer, mockGetTransfer, mockListTransfers, mockUpdateTransfer]);
        mockCreateTransfer.mock.mockImplementation(async () => mockTransfer);
        mockGetTransfer.mock.mockImplementation(async () => mockTransfer);
        mockListTransfers.mock.mockImplementation(async () => ({ total: 1, page: 0, per_page: 25, objects: [mockTransfer] }));
        mockUpdateTransfer.mock.mockImplementation(async () => mockTransfer);
    });

    it("createTransfer forwards the body", async () => {
        await Cybrid.createTransfer({ transfer_type: "book" } as never);
        assert.deepEqual(mockCreateTransfer.mock.calls[0]!.arguments, [{ transfer_type: "book" }]);
    });

    it("getTransfer throws 400 when guid is missing", async () => {
        await expectBadRequest(Cybrid.getTransfer(""), /Transfer GUID/);
    });

    it("listTransfers forwards the customerGuid", async () => {
        await Cybrid.listTransfers("cust-1");
        assert.equal(mockListTransfers.mock.calls[0]!.arguments[0], "cust-1");
    });

    it("updateTransfer throws 400 when guid is missing", async () => {
        await expectBadRequest(Cybrid.updateTransfer("", {} as never), /Transfer GUID/);
    });

    it("updateTransfer forwards the guid and patch body", async () => {
        const patch = { state: "completed" };
        await Cybrid.updateTransfer("transfer-1", patch as never);
        assert.deepEqual(mockUpdateTransfer.mock.calls[0]!.arguments, ["transfer-1", patch]);
    });
});

// --- Identity Verifications ---

describe("Cybrid.identityVerifications", () => {
    const mockVerification = { guid: "iv-1", state: "waiting" };

    beforeEach(() => {
        resetAll([mockCreateIdentityVerification, mockGetIdentityVerification, mockListIdentityVerifications]);
        mockCreateIdentityVerification.mock.mockImplementation(async () => mockVerification);
        mockGetIdentityVerification.mock.mockImplementation(async () => mockVerification);
        mockListIdentityVerifications.mock.mockImplementation(async () => ({ total: 1, page: 0, per_page: 25, objects: [mockVerification] }));
    });

    it("createIdentityVerification forwards the body", async () => {
        await Cybrid.createIdentityVerification({ customer_guid: "cust-1" } as never);
        assert.deepEqual(mockCreateIdentityVerification.mock.calls[0]!.arguments, [{ customer_guid: "cust-1" }]);
    });

    it("getIdentityVerification throws 400 when guid is missing", async () => {
        await expectBadRequest(Cybrid.getIdentityVerification(""), /Verification GUID/);
    });

    it("getIdentityVerification forwards the guid", async () => {
        await Cybrid.getIdentityVerification("iv-1");
        assert.deepEqual(mockGetIdentityVerification.mock.calls[0]!.arguments, ["iv-1"]);
    });

    it("listIdentityVerifications forwards customer and paging", async () => {
        await Cybrid.listIdentityVerifications("cust-1", 0, 25);
        assert.deepEqual(mockListIdentityVerifications.mock.calls[0]!.arguments, ["cust-1", 0, 25]);
    });
});

// --- Market data ---

describe("Cybrid.marketData", () => {

    beforeEach(() => {
        resetAll([mockListSymbols, mockListAssets, mockListPrices]);
        mockListSymbols.mock.mockImplementation(async () => ["BTC-USD"]);
        mockListAssets.mock.mockImplementation(async () => ({ total: 1, page: 0, per_page: 25, objects: [{ code: "USD" }] }));
        mockListPrices.mock.mockImplementation(async () => [{ symbol: "BTC-USD" }]);
    });

    it("listSymbols returns the array", async () => {
        const result = await Cybrid.listSymbols();
        assert.deepEqual(result, ["BTC-USD"]);
    });

    it("listAssets forwards paging and code", async () => {
        await Cybrid.listAssets(1, 50, "USD");
        assert.deepEqual(mockListAssets.mock.calls[0]!.arguments, [1, 50, "USD"]);
    });

    it("listPrices forwards the symbol", async () => {
        await Cybrid.listPrices("BTC-USD");
        assert.deepEqual(mockListPrices.mock.calls[0]!.arguments, ["BTC-USD"]);
    });

    it("listSymbols wraps non-HTMLStatusError as 500", async () => {
        mockListSymbols.mock.mockImplementation(async () => {
            throw new Error("upstream down");
        });
        await expectWrappedError(Cybrid.listSymbols(), /upstream down/);
    });
});

// --- Deposit addresses ---

describe("Cybrid.depositAddresses", () => {
    const mockAddress = { guid: "dep-1", address: "bc1q..." };

    beforeEach(() => {
        resetAll([mockCreateDepositAddress, mockGetDepositAddress, mockListDepositAddresses]);
        mockCreateDepositAddress.mock.mockImplementation(async () => mockAddress);
        mockGetDepositAddress.mock.mockImplementation(async () => mockAddress);
        mockListDepositAddresses.mock.mockImplementation(async () => ({ total: 1, page: 0, per_page: 25, objects: [mockAddress] }));
    });

    it("createDepositAddress forwards the body", async () => {
        await Cybrid.createDepositAddress({ account_guid: "acct-1" } as never);
        assert.deepEqual(mockCreateDepositAddress.mock.calls[0]!.arguments, [{ account_guid: "acct-1" }]);
    });

    it("getDepositAddress throws 400 when guid is missing", async () => {
        await expectBadRequest(Cybrid.getDepositAddress(""), /Deposit Address GUID/);
    });

    it("listDepositAddresses forwards customer and paging", async () => {
        await Cybrid.listDepositAddresses("cust-1", 0, 25);
        assert.deepEqual(mockListDepositAddresses.mock.calls[0]!.arguments, ["cust-1", 0, 25]);
    });
});

// --- Deposit bank accounts ---

describe("Cybrid.depositBankAccounts", () => {
    const mockDba = { guid: "dba-1" };

    beforeEach(() => {
        resetAll([mockCreateDepositBankAccount, mockGetDepositBankAccount, mockListDepositBankAccounts]);
        mockCreateDepositBankAccount.mock.mockImplementation(async () => mockDba);
        mockGetDepositBankAccount.mock.mockImplementation(async () => mockDba);
        mockListDepositBankAccounts.mock.mockImplementation(async () => ({ total: 1, page: 0, per_page: 25, objects: [mockDba] }));
    });

    it("createDepositBankAccount forwards the body", async () => {
        await Cybrid.createDepositBankAccount({ customer_guid: "cust-1" } as never);
        assert.deepEqual(mockCreateDepositBankAccount.mock.calls[0]!.arguments, [{ customer_guid: "cust-1" }]);
    });

    it("getDepositBankAccount throws 400 when guid is missing", async () => {
        await expectBadRequest(Cybrid.getDepositBankAccount(""), /Deposit Bank Account GUID/);
    });

    it("getDepositBankAccount forwards the guid", async () => {
        await Cybrid.getDepositBankAccount("dba-1");
        assert.deepEqual(mockGetDepositBankAccount.mock.calls[0]!.arguments, ["dba-1"]);
    });
});

// --- External bank accounts ---

describe("Cybrid.externalBankAccounts", () => {
    const mockEba = { guid: "eba-1", state: "storing" };

    beforeEach(() => {
        resetAll([
            mockCreateExternalBankAccount,
            mockGetExternalBankAccount,
            mockListExternalBankAccounts,
            mockPatchExternalBankAccount,
            mockDeleteExternalBankAccount,
        ]);
        for (const m of [mockCreateExternalBankAccount, mockGetExternalBankAccount, mockPatchExternalBankAccount, mockDeleteExternalBankAccount]) {
            m.mock.mockImplementation(async () => mockEba);
        }
        mockListExternalBankAccounts.mock.mockImplementation(async () => ({ total: 1, page: 0, per_page: 25, objects: [mockEba] }));
    });

    it("createExternalBankAccount forwards the body", async () => {
        await Cybrid.createExternalBankAccount({ name: "Checking" } as never);
        assert.deepEqual(mockCreateExternalBankAccount.mock.calls[0]!.arguments, [{ name: "Checking" }]);
    });

    it("getExternalBankAccount throws 400 when guid is missing", async () => {
        await expectBadRequest(Cybrid.getExternalBankAccount(""), /External Bank Account GUID/);
    });

    it("getExternalBankAccount defaults boolean flags to false", async () => {
        await Cybrid.getExternalBankAccount("eba-1");
        assert.deepEqual(mockGetExternalBankAccount.mock.calls[0]!.arguments, ["eba-1", false, false, false]);
    });

    it("getExternalBankAccount forwards boolean flags when set", async () => {
        await Cybrid.getExternalBankAccount("eba-1", true, true, true);
        assert.deepEqual(mockGetExternalBankAccount.mock.calls[0]!.arguments, ["eba-1", true, true, true]);
    });

    it("patchExternalBankAccount throws 400 when guid is missing", async () => {
        await expectBadRequest(Cybrid.patchExternalBankAccount("", {} as never), /External Bank Account GUID/);
    });

    it("patchExternalBankAccount forwards guid and body", async () => {
        const patch = { state: "refresh" };
        await Cybrid.patchExternalBankAccount("eba-1", patch as never);
        assert.deepEqual(mockPatchExternalBankAccount.mock.calls[0]!.arguments, ["eba-1", patch]);
    });

    it("deleteExternalBankAccount throws 400 when guid is missing", async () => {
        await expectBadRequest(Cybrid.deleteExternalBankAccount(""), /External Bank Account GUID/);
    });

    it("deleteExternalBankAccount forwards the guid", async () => {
        await Cybrid.deleteExternalBankAccount("eba-1");
        assert.deepEqual(mockDeleteExternalBankAccount.mock.calls[0]!.arguments, ["eba-1"]);
    });
});

// --- External wallets ---

describe("Cybrid.externalWallets", () => {
    const mockWallet = { guid: "wallet-1" };

    beforeEach(() => {
        resetAll([mockCreateExternalWallet, mockGetExternalWallet, mockListExternalWallets, mockDeleteExternalWallet]);
        for (const m of [mockCreateExternalWallet, mockGetExternalWallet, mockDeleteExternalWallet]) {
            m.mock.mockImplementation(async () => mockWallet);
        }
        mockListExternalWallets.mock.mockImplementation(async () => ({ total: 1, page: 0, per_page: 25, objects: [mockWallet] }));
    });

    it("createExternalWallet forwards the body", async () => {
        await Cybrid.createExternalWallet({ asset: "BTC" } as never);
        assert.deepEqual(mockCreateExternalWallet.mock.calls[0]!.arguments, [{ asset: "BTC" }]);
    });

    it("getExternalWallet throws 400 when guid is missing", async () => {
        await expectBadRequest(Cybrid.getExternalWallet(""), /External Wallet GUID/);
    });

    it("deleteExternalWallet throws 400 when guid is missing", async () => {
        await expectBadRequest(Cybrid.deleteExternalWallet(""), /External Wallet GUID/);
    });

    it("deleteExternalWallet forwards the guid", async () => {
        await Cybrid.deleteExternalWallet("wallet-1");
        assert.deepEqual(mockDeleteExternalWallet.mock.calls[0]!.arguments, ["wallet-1"]);
    });
});

// --- Workflows ---

describe("Cybrid.workflows", () => {
    const mockWorkflow = { guid: "wf-1", state: "storing" };

    beforeEach(() => {
        resetAll([mockCreateWorkflow, mockGetWorkflow, mockListWorkflows]);
        mockCreateWorkflow.mock.mockImplementation(async () => mockWorkflow);
        mockGetWorkflow.mock.mockImplementation(async () => mockWorkflow);
        mockListWorkflows.mock.mockImplementation(async () => ({ total: 1, page: 0, per_page: 25, objects: [mockWorkflow] }));
    });

    it("createWorkflow forwards the body", async () => {
        await Cybrid.createWorkflow({ kind: "kyc" } as never);
        assert.deepEqual(mockCreateWorkflow.mock.calls[0]!.arguments, [{ kind: "kyc" }]);
    });

    it("getWorkflow throws 400 when guid is missing", async () => {
        await expectBadRequest(Cybrid.getWorkflow(""), /Workflow GUID/);
    });

    it("createWorkflow wraps non-HTMLStatusError as 500", async () => {
        mockCreateWorkflow.mock.mockImplementation(async () => {
            throw new Error("wf boom");
        });
        await expectWrappedError(Cybrid.createWorkflow({} as never), /wf boom/);
    });
});

// --- Banks ---

describe("Cybrid.banks", () => {
    const mockBank = { guid: "bank-1" };

    beforeEach(() => {
        resetAll([mockCreateBank, mockGetBank, mockListBanks, mockUpdateBank]);
        mockCreateBank.mock.mockImplementation(async () => mockBank);
        mockGetBank.mock.mockImplementation(async () => mockBank);
        mockListBanks.mock.mockImplementation(async () => ({ total: 1, page: 0, per_page: 25, objects: [mockBank] }));
        mockUpdateBank.mock.mockImplementation(async () => mockBank);
    });

    it("createBank forwards the body", async () => {
        await Cybrid.createBank({ name: "test" } as never);
        assert.deepEqual(mockCreateBank.mock.calls[0]!.arguments, [{ name: "test" }]);
    });

    it("getBank throws 400 when guid is missing", async () => {
        await expectBadRequest(Cybrid.getBank(""), /Bank GUID/);
    });

    it("listBanks forwards paging and type", async () => {
        await Cybrid.listBanks(0, 25, "sandbox");
        assert.deepEqual(mockListBanks.mock.calls[0]!.arguments, [0, 25, "sandbox"]);
    });

    it("updateBank throws 400 when guid is missing", async () => {
        await expectBadRequest(Cybrid.updateBank("", {} as never), /Bank GUID/);
    });

    it("updateBank forwards the guid and patch body", async () => {
        const patch = { name: "renamed" };
        await Cybrid.updateBank("bank-1", patch as never);
        assert.deepEqual(mockUpdateBank.mock.calls[0]!.arguments, ["bank-1", patch]);
    });
});

// --- Counterparties ---

describe("Cybrid.counterparties", () => {
    const mockCp = { guid: "cp-1" };

    beforeEach(() => {
        resetAll([mockCreateCounterparty, mockGetCounterparty, mockListCounterparties]);
        mockCreateCounterparty.mock.mockImplementation(async () => mockCp);
        mockGetCounterparty.mock.mockImplementation(async () => mockCp);
        mockListCounterparties.mock.mockImplementation(async () => ({ total: 1, page: 0, per_page: 25, objects: [mockCp] }));
    });

    it("createCounterparty forwards the body", async () => {
        await Cybrid.createCounterparty({ type: "individual" } as never);
        assert.deepEqual(mockCreateCounterparty.mock.calls[0]!.arguments, [{ type: "individual" }]);
    });

    it("getCounterparty throws 400 when guid is missing", async () => {
        await expectBadRequest(Cybrid.getCounterparty(""), /Counterparty GUID/);
    });

    it("getCounterparty defaults includePii to false", async () => {
        await Cybrid.getCounterparty("cp-1");
        assert.deepEqual(mockGetCounterparty.mock.calls[0]!.arguments, ["cp-1", false]);
    });

    it("getCounterparty forwards includePii=true", async () => {
        await Cybrid.getCounterparty("cp-1", true);
        assert.deepEqual(mockGetCounterparty.mock.calls[0]!.arguments, ["cp-1", true]);
    });
});

// --- Persona sessions ---

describe("Cybrid.personaSessions", () => {

    beforeEach(() => {
        resetAll([mockCreatePersonaSession]);
        mockCreatePersonaSession.mock.mockImplementation(async () => ({ client_token: "tok" }));
    });

    it("createPersonaSession forwards the body", async () => {
        await Cybrid.createPersonaSession({ identity_verification_guid: "iv-1" } as never);
        assert.deepEqual(mockCreatePersonaSession.mock.calls[0]!.arguments, [{ identity_verification_guid: "iv-1" }]);
    });

    it("createPersonaSession wraps non-HTMLStatusError as 500", async () => {
        mockCreatePersonaSession.mock.mockImplementation(async () => {
            throw new Error("persona down");
        });
        await expectWrappedError(Cybrid.createPersonaSession({} as never), /persona down/);
    });
});

// --- Files ---

describe("Cybrid.files", () => {
    const mockFile = { guid: "file-1" };

    beforeEach(() => {
        resetAll([mockCreateFile, mockGetFile, mockListFiles]);
        mockCreateFile.mock.mockImplementation(async () => mockFile);
        mockGetFile.mock.mockImplementation(async () => mockFile);
        mockListFiles.mock.mockImplementation(async () => ({ total: 1, page: 0, per_page: 25, objects: [mockFile] }));
    });

    it("createFile forwards the body", async () => {
        await Cybrid.createFile({ file_type: "id_card" } as never);
        assert.deepEqual(mockCreateFile.mock.calls[0]!.arguments, [{ file_type: "id_card" }]);
    });

    it("getFile throws 400 when guid is missing", async () => {
        await expectBadRequest(Cybrid.getFile(""), /File GUID/);
    });

    it("getFile forwards guid and includeDownloadUrl", async () => {
        await Cybrid.getFile("file-1", "true");
        assert.deepEqual(mockGetFile.mock.calls[0]!.arguments, ["file-1", "true"]);
    });
});

// --- Executions ---

describe("Cybrid.executions", () => {
    const mockExec = { guid: "exec-1" };

    beforeEach(() => {
        resetAll([mockCreateExecution, mockGetExecution, mockListExecutions]);
        mockCreateExecution.mock.mockImplementation(async () => mockExec);
        mockGetExecution.mock.mockImplementation(async () => mockExec);
        mockListExecutions.mock.mockImplementation(async () => ({ total: 1, page: 0, per_page: 25, objects: [mockExec] }));
    });

    it("createExecution forwards the body", async () => {
        await Cybrid.createExecution({ plan_guid: "plan-1" } as never);
        assert.deepEqual(mockCreateExecution.mock.calls[0]!.arguments, [{ plan_guid: "plan-1" }]);
    });

    it("getExecution throws 400 when guid is missing", async () => {
        await expectBadRequest(Cybrid.getExecution(""), /Execution GUID/);
    });
});

// --- Invoices ---

describe("Cybrid.invoices", () => {
    const mockInvoice = { guid: "inv-1", state: "pending" };

    beforeEach(() => {
        resetAll([mockCreateInvoice, mockGetInvoice, mockListInvoices, mockCancelInvoice]);
        mockCreateInvoice.mock.mockImplementation(async () => mockInvoice);
        mockGetInvoice.mock.mockImplementation(async () => mockInvoice);
        mockListInvoices.mock.mockImplementation(async () => ({ total: 1, page: 0, per_page: 25, objects: [mockInvoice] }));
        mockCancelInvoice.mock.mockImplementation(async () => ({ ...mockInvoice, state: "cancelled" }));
    });

    it("createInvoice forwards the body", async () => {
        await Cybrid.createInvoice({ amount: 100 } as never);
        assert.deepEqual(mockCreateInvoice.mock.calls[0]!.arguments, [{ amount: 100 }]);
    });

    it("getInvoice throws 400 when guid is missing", async () => {
        await expectBadRequest(Cybrid.getInvoice(""), /Invoice GUID/);
    });

    it("cancelInvoice throws 400 when guid is missing", async () => {
        await expectBadRequest(Cybrid.cancelInvoice(""), /Invoice GUID/);
    });

    it("cancelInvoice forwards the guid", async () => {
        const result = await Cybrid.cancelInvoice("inv-1");
        assert.equal(result.state, "cancelled");
        assert.deepEqual(mockCancelInvoice.mock.calls[0]!.arguments, ["inv-1"]);
    });
});

// --- Payment instructions ---

describe("Cybrid.paymentInstructions", () => {
    const mockPi = { guid: "pi-1" };

    beforeEach(() => {
        resetAll([mockCreatePaymentInstruction, mockGetPaymentInstruction, mockListPaymentInstructions]);
        mockCreatePaymentInstruction.mock.mockImplementation(async () => mockPi);
        mockGetPaymentInstruction.mock.mockImplementation(async () => mockPi);
        mockListPaymentInstructions.mock.mockImplementation(async () => ({ total: 1, page: 0, per_page: 25, objects: [mockPi] }));
    });

    it("createPaymentInstruction forwards the body", async () => {
        await Cybrid.createPaymentInstruction({ invoice_guid: "inv-1" } as never);
        assert.deepEqual(mockCreatePaymentInstruction.mock.calls[0]!.arguments, [{ invoice_guid: "inv-1" }]);
    });

    it("getPaymentInstruction throws 400 when guid is missing", async () => {
        await expectBadRequest(Cybrid.getPaymentInstruction(""), /Payment Instruction GUID/);
    });

    it("listPaymentInstructions forwards both customer and invoice guid", async () => {
        await Cybrid.listPaymentInstructions("cust-1", "inv-1", 0, 25);
        assert.deepEqual(mockListPaymentInstructions.mock.calls[0]!.arguments, ["cust-1", "inv-1", 0, 25]);
    });
});

// --- Plans ---

describe("Cybrid.plans", () => {
    const mockPlan = { guid: "plan-1" };

    beforeEach(() => {
        resetAll([mockCreatePlan, mockGetPlan, mockListPlans]);
        mockCreatePlan.mock.mockImplementation(async () => mockPlan);
        mockGetPlan.mock.mockImplementation(async () => mockPlan);
        mockListPlans.mock.mockImplementation(async () => ({ total: 1, page: 0, per_page: 25, objects: [mockPlan] }));
    });

    it("createPlan forwards the body", async () => {
        await Cybrid.createPlan({ name: "monthly" } as never);
        assert.deepEqual(mockCreatePlan.mock.calls[0]!.arguments, [{ name: "monthly" }]);
    });

    it("getPlan throws 400 when guid is missing", async () => {
        await expectBadRequest(Cybrid.getPlan(""), /Plan GUID/);
    });

    it("listPlans forwards customer and paging", async () => {
        await Cybrid.listPlans("cust-1", 0, 25);
        assert.deepEqual(mockListPlans.mock.calls[0]!.arguments, ["cust-1", 0, 25]);
    });
});

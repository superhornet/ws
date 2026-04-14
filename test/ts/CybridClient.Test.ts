import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Observable, of, throwError } from "rxjs";
import { HTMLStatusError } from "../../src/main/ts/libs/HTMLStatusError.ts";

// --- Mock results ---

const mockQuoteResult = { guid: "quote-guid-789", product_type: "book_transfer", asset: "USD", deliver_amount: 3000 };
const mockTransferResult = { guid: "transfer-guid-abc", transfer_type: "book", state: "completed" };
const mockCustomerResult = { guid: "customer-guid-123", type: "individual", state: "storing" };
const mockCustomerList = { total: 1, page: 0, per_page: 25, objects: [mockCustomerResult] };
const mockAccountResult = { guid: "account-guid-123", type: "fiat", asset: "USD", state: "created" };
const mockAccountList = { total: 1, page: 0, per_page: 25, objects: [mockAccountResult] };
const mockSymbolsResult = ["BTC-USD", "ETH-USD"];
const mockPricesResult = [{ symbol: "BTC-USD", buy_price: "5000000", sell_price: "4999000" }];
const mockAssetList = { total: 2, page: 0, per_page: 25, objects: [{ code: "USD" }, { code: "BTC" }] };
const mockDepositAddressResult = { guid: "dep-addr-1", address: "bc1qxyz" };
const mockBankResult = { guid: "bank-guid-1", name: "Test Bank" };
const mockExternalBankAccountResult = { guid: "eba-guid-1", state: "storing" };

type ObservableFn = (arg?: Record<string, unknown>) => Observable<unknown>;

// --- Per-API method mocks ---

const mockCreateQuote = mock.fn<ObservableFn>(() => of(mockQuoteResult));
const mockGetQuote = mock.fn<ObservableFn>(() => of(mockQuoteResult));
const mockListQuotes = mock.fn<ObservableFn>(() => of({ total: 1, page: 0, per_page: 25, objects: [mockQuoteResult] }));

const mockCreateTransfer = mock.fn<ObservableFn>(() => of(mockTransferResult));
const mockGetTransfer = mock.fn<ObservableFn>(() => of(mockTransferResult));
const mockListTransfers = mock.fn<ObservableFn>(() => of({ total: 1, page: 0, per_page: 25, objects: [mockTransferResult] }));

const mockCreateCustomer = mock.fn<ObservableFn>(() => of(mockCustomerResult));
const mockGetCustomer = mock.fn<ObservableFn>(() => of(mockCustomerResult));
const mockListCustomers = mock.fn<ObservableFn>(() => of(mockCustomerList));
const mockUpdateCustomer = mock.fn<ObservableFn>(() => of(mockCustomerResult));

const mockCreateAccount = mock.fn<ObservableFn>(() => of(mockAccountResult));
const mockGetAccount = mock.fn<ObservableFn>(() => of(mockAccountResult));
const mockListAccounts = mock.fn<ObservableFn>(() => of(mockAccountList));

const mockListSymbols = mock.fn<ObservableFn>(() => of(mockSymbolsResult));
const mockListAssets = mock.fn<ObservableFn>(() => of(mockAssetList));
const mockListPrices = mock.fn<ObservableFn>(() => of(mockPricesResult));

const mockCreateDepositAddress = mock.fn<ObservableFn>(() => of(mockDepositAddressResult));

const mockCreateBank = mock.fn<ObservableFn>(() => of(mockBankResult));
const mockGetBank = mock.fn<ObservableFn>(() => of(mockBankResult));
const mockListBanks = mock.fn<ObservableFn>(() => of({ total: 1, page: 0, per_page: 25, objects: [mockBankResult] }));

const mockCreateExternalBankAccount = mock.fn<ObservableFn>(() => of(mockExternalBankAccountResult));
const mockDeleteExternalBankAccount = mock.fn<ObservableFn>(() => of(mockExternalBankAccountResult));

mock.module("@cybrid/cybrid-api-bank-typescript", {
    namedExports: {
        Configuration: class {},
        CustomersBankApi: class {
            createCustomer = mockCreateCustomer;
            getCustomer = mockGetCustomer;
            listCustomers = mockListCustomers;
            updateCustomer = mockUpdateCustomer;
        },
        AccountsBankApi: class {
            createAccount = mockCreateAccount;
            getAccount = mockGetAccount;
            listAccounts = mockListAccounts;
        },
        QuotesBankApi: class {
            createQuote = mockCreateQuote;
            getQuote = mockGetQuote;
            listQuotes = mockListQuotes;
        },
        TradesBankApi: class {},
        TransfersBankApi: class {
            createTransfer = mockCreateTransfer;
            getTransfer = mockGetTransfer;
            listTransfers = mockListTransfers;
        },
        IdentityVerificationsBankApi: class {},
        SymbolsBankApi: class {
            listSymbols = mockListSymbols;
        },
        AssetsBankApi: class {
            listAssets = mockListAssets;
        },
        PricesBankApi: class {
            listPrices = mockListPrices;
        },
        DepositAddressesBankApi: class {
            createDepositAddress = mockCreateDepositAddress;
        },
        DepositBankAccountsBankApi: class {},
        ExternalBankAccountsBankApi: class {
            createExternalBankAccount = mockCreateExternalBankAccount;
            deleteExternalBankAccount = mockDeleteExternalBankAccount;
        },
        ExternalWalletsBankApi: class {},
        WorkflowsBankApi: class {},
        BanksBankApi: class {
            createBank = mockCreateBank;
            getBank = mockGetBank;
            listBanks = mockListBanks;
        },
        CounterpartiesBankApi: class {},
        PersonaSessionsBankApi: class {},
        FilesBankApi: class {},
        ExecutionsBankApi: class {},
        InvoicesBankApi: class {},
        PaymentInstructionsBankApi: class {},
        PlansBankApi: class {},
        PostQuoteBankModelProductTypeEnum: {
            Trading: "trading",
            Funding: "funding",
            CryptoTransfer: "crypto_transfer",
            InterAccount: "inter_account",
            LightningTransfer: "lightning_transfer",
            BookTransfer: "book_transfer",
        },
        PostTransferBankModelTransferTypeEnum: {
            Funding: "funding",
            Crypto: "crypto",
            InstantFunding: "instant_funding",
            InterAccount: "inter_account",
            Lightning: "lightning",
            Book: "book",
        },
        PostTransferParticipantBankModelTypeEnum: {
            Bank: "bank",
            Customer: "customer",
            Counterparty: "counterparty",
        },
    },
});

const CybridClient = await import("../../src/main/ts/libs/CybridClient.ts");

describe("CybridClient.createBookTransfer", () => {

    beforeEach(() => {
        mockCreateQuote.mock.resetCalls();
        mockCreateTransfer.mock.resetCalls();
        mockCreateQuote.mock.mockImplementation(() => of(mockQuoteResult));
        mockCreateTransfer.mock.mockImplementation(() => of(mockTransferResult));
    });

    it("should create a book_transfer quote then a book transfer", async () => {
        const result = await CybridClient.createBookTransfer("src-acct", "dst-acct", 3000, "USD");

        assert.equal(mockCreateQuote.mock.callCount(), 1);
        const quoteArgs = mockCreateQuote.mock.calls[0]!.arguments[0] as unknown as Record<string, unknown>;
        const postQuote = (quoteArgs as Record<string, Record<string, unknown>>).postQuoteBankModel;
        assert.equal(postQuote!.product_type, "book_transfer");
        assert.equal(postQuote!.asset, "USD");
        assert.equal(postQuote!.deliver_amount, 3000);

        assert.equal(mockCreateTransfer.mock.callCount(), 1);
        const transferArgs = mockCreateTransfer.mock.calls[0]!.arguments[0] as unknown as Record<string, unknown>;
        const postTransfer = (transferArgs as Record<string, Record<string, unknown>>).postTransferBankModel;
        assert.equal(postTransfer!.quote_guid, "quote-guid-789");
        assert.equal(postTransfer!.transfer_type, "book");
        assert.equal(postTransfer!.source_account_guid, "src-acct");
        assert.equal(postTransfer!.destination_account_guid, "dst-acct");

        assert.equal(result.guid, "transfer-guid-abc");
    });

    it("should default asset to USD when not provided", async () => {
        await CybridClient.createBookTransfer("src-acct", "dst-acct", 1000);

        const quoteArgs = mockCreateQuote.mock.calls[0]!.arguments[0] as unknown as Record<string, unknown>;
        const postQuote = (quoteArgs as Record<string, Record<string, unknown>>).postQuoteBankModel;
        assert.equal(postQuote!.asset, "USD");
    });

    it("should throw if quote returns no guid", async () => {
        mockCreateQuote.mock.mockImplementation(() => of({ ...mockQuoteResult, guid: undefined } as unknown as typeof mockQuoteResult));

        await assert.rejects(
            () => CybridClient.createBookTransfer("src-acct", "dst-acct", 1000),
            (error: HTMLStatusError) => {
                assert.equal(error.statusCode, 500);
                assert.match(error.message, /Quote creation failed/);
                return true;
            },
        );
    });

    it("should not call createTransfer if quote has no guid", async () => {
        mockCreateQuote.mock.mockImplementation(() => of({ ...mockQuoteResult, guid: undefined } as unknown as typeof mockQuoteResult));

        try {
            await CybridClient.createBookTransfer("src-acct", "dst-acct", 1000);
        } catch {
            // expected
        }

        assert.equal(mockCreateTransfer.mock.callCount(), 0);
    });

    it("should build source and destination participants with the exact expected shape", async () => {
        // Pins current production behavior: participant type is "customer",
        // amount is 0 (real amount lives in the quote), and guid is the
        // *account* guid passed in. Any regression that reshuffles this would
        // silently break book transfers at the Cybrid layer.
        await CybridClient.createBookTransfer("src-acct", "dst-acct", 3000, "USD");

        const transferArgs = mockCreateTransfer.mock.calls[0]!.arguments[0] as unknown as Record<string, unknown>;
        const postTransfer = (transferArgs as Record<string, Record<string, unknown>>).postTransferBankModel!;

        assert.deepEqual(postTransfer.source_participants, [
            { type: "customer", amount: 0, guid: "src-acct" },
        ]);
        assert.deepEqual(postTransfer.destination_participants, [
            { type: "customer", amount: 0, guid: "dst-acct" },
        ]);
    });

    it("should bubble up an error from createTransfer after a successful quote", async () => {
        mockCreateTransfer.mock.mockImplementation(() =>
            throwError(() => new Error("transfer service unavailable")),
        );

        await assert.rejects(
            () => CybridClient.createBookTransfer("src-acct", "dst-acct", 3000),
            (error: Error) => {
                assert.match(error.message, /transfer service unavailable/);
                return true;
            },
        );

        // The quote was created successfully — the failure happened on the
        // subsequent createTransfer call. No cleanup/rollback of the quote is
        // attempted today; this test locks in that behavior.
        assert.equal(mockCreateQuote.mock.callCount(), 1);
        assert.equal(mockCreateTransfer.mock.callCount(), 1);
    });
});

describe("CybridClient.customers", () => {

    beforeEach(() => {
        mockCreateCustomer.mock.resetCalls();
        mockGetCustomer.mock.resetCalls();
        mockListCustomers.mock.resetCalls();
        mockUpdateCustomer.mock.resetCalls();
    });

    it("createCustomer should unwrap the observable and forward the body", async () => {
        const body = { type: "individual" };
        const result = await CybridClient.createCustomer(body as never);
        assert.equal(result.guid, "customer-guid-123");
        assert.equal(mockCreateCustomer.mock.callCount(), 1);
        const args = mockCreateCustomer.mock.calls[0]!.arguments[0] as Record<string, unknown>;
        assert.deepEqual(args.postCustomerBankModel, body);
    });

    it("getCustomer should pass the guid and default includePii to false", async () => {
        await CybridClient.getCustomer("customer-guid-123");
        const args = mockGetCustomer.mock.calls[0]!.arguments[0] as Record<string, unknown>;
        assert.equal(args.customerGuid, "customer-guid-123");
        assert.equal(args.includePii, false);
    });

    it("getCustomer should pass includePii=true when requested", async () => {
        await CybridClient.getCustomer("customer-guid-123", true);
        const args = mockGetCustomer.mock.calls[0]!.arguments[0] as Record<string, unknown>;
        assert.equal(args.includePii, true);
    });

    it("listCustomers should default page/perPage when omitted", async () => {
        const result = await CybridClient.listCustomers();
        assert.equal(result.total, 1);
        const args = mockListCustomers.mock.calls[0]!.arguments[0] as Record<string, unknown>;
        assert.equal(args.page, 0);
        assert.equal(args.perPage, 25);
    });

    it("updateCustomer should forward the guid and patch body", async () => {
        const patch = { name: { first: "Jane" } };
        await CybridClient.updateCustomer("customer-guid-123", patch as never);
        const args = mockUpdateCustomer.mock.calls[0]!.arguments[0] as Record<string, unknown>;
        assert.equal(args.customerGuid, "customer-guid-123");
        assert.deepEqual(args.patchCustomerBankModel, patch);
    });
});

describe("CybridClient.accounts", () => {

    beforeEach(() => {
        mockCreateAccount.mock.resetCalls();
        mockGetAccount.mock.resetCalls();
        mockListAccounts.mock.resetCalls();
    });

    it("createAccount should forward the body", async () => {
        const body = { type: "fiat", asset: "USD", customer_guid: "cust-1" };
        const result = await CybridClient.createAccount(body as never);
        assert.equal(result.guid, "account-guid-123");
        const args = mockCreateAccount.mock.calls[0]!.arguments[0] as Record<string, unknown>;
        assert.deepEqual(args.postAccountBankModel, body);
    });

    it("getAccount should forward the guid", async () => {
        await CybridClient.getAccount("account-guid-123");
        const args = mockGetAccount.mock.calls[0]!.arguments[0] as Record<string, unknown>;
        assert.equal(args.accountGuid, "account-guid-123");
    });

    it("listAccounts should include customerGuid only when provided", async () => {
        await CybridClient.listAccounts();
        let args = mockListAccounts.mock.calls[0]!.arguments[0] as Record<string, unknown>;
        assert.equal("customerGuid" in args, false);

        mockListAccounts.mock.resetCalls();
        await CybridClient.listAccounts("cust-1");
        args = mockListAccounts.mock.calls[0]!.arguments[0] as Record<string, unknown>;
        assert.equal(args.customerGuid, "cust-1");
    });
});

describe("CybridClient.market data", () => {

    beforeEach(() => {
        mockListSymbols.mock.resetCalls();
        mockListAssets.mock.resetCalls();
        mockListPrices.mock.resetCalls();
    });

    it("listSymbols should unwrap the observable", async () => {
        const result = await CybridClient.listSymbols();
        assert.deepEqual(result, mockSymbolsResult);
        assert.equal(mockListSymbols.mock.callCount(), 1);
    });

    it("listAssets should include code only when provided", async () => {
        await CybridClient.listAssets();
        let args = mockListAssets.mock.calls[0]!.arguments[0] as Record<string, unknown>;
        assert.equal("code" in args, false);

        mockListAssets.mock.resetCalls();
        await CybridClient.listAssets(0, 25, "USD");
        args = mockListAssets.mock.calls[0]!.arguments[0] as Record<string, unknown>;
        assert.equal(args.code, "USD");
    });

    it("listPrices should include symbol only when provided", async () => {
        await CybridClient.listPrices();
        let args = mockListPrices.mock.calls[0]!.arguments[0] as Record<string, unknown>;
        assert.equal("symbol" in args, false);

        mockListPrices.mock.resetCalls();
        await CybridClient.listPrices("BTC-USD");
        args = mockListPrices.mock.calls[0]!.arguments[0] as Record<string, unknown>;
        assert.equal(args.symbol, "BTC-USD");
    });
});

describe("CybridClient.banks", () => {

    beforeEach(() => {
        mockCreateBank.mock.resetCalls();
        mockGetBank.mock.resetCalls();
        mockListBanks.mock.resetCalls();
    });

    it("createBank should forward the body", async () => {
        const body = { name: "My Bank", type: "sandbox" };
        const result = await CybridClient.createBank(body as never);
        assert.equal(result.guid, "bank-guid-1");
        const args = mockCreateBank.mock.calls[0]!.arguments[0] as Record<string, unknown>;
        assert.deepEqual(args.postBankBankModel, body);
    });

    it("getBank should forward the guid", async () => {
        await CybridClient.getBank("bank-guid-1");
        const args = mockGetBank.mock.calls[0]!.arguments[0] as Record<string, unknown>;
        assert.equal(args.bankGuid, "bank-guid-1");
    });

    it("listBanks should include type only when provided", async () => {
        await CybridClient.listBanks();
        let args = mockListBanks.mock.calls[0]!.arguments[0] as Record<string, unknown>;
        assert.equal("type" in args, false);

        mockListBanks.mock.resetCalls();
        await CybridClient.listBanks(0, 25, "sandbox");
        args = mockListBanks.mock.calls[0]!.arguments[0] as Record<string, unknown>;
        assert.equal(args.type, "sandbox");
    });
});

describe("CybridClient.external bank accounts", () => {

    beforeEach(() => {
        mockCreateExternalBankAccount.mock.resetCalls();
        mockDeleteExternalBankAccount.mock.resetCalls();
    });

    it("createExternalBankAccount should forward the body", async () => {
        const body = { name: "Checking", customer_guid: "cust-1" };
        await CybridClient.createExternalBankAccount(body as never);
        const args = mockCreateExternalBankAccount.mock.calls[0]!.arguments[0] as Record<string, unknown>;
        assert.deepEqual(args.postExternalBankAccountBankModel, body);
    });

    it("deleteExternalBankAccount should forward the guid", async () => {
        await CybridClient.deleteExternalBankAccount("eba-guid-1");
        const args = mockDeleteExternalBankAccount.mock.calls[0]!.arguments[0] as Record<string, unknown>;
        assert.equal(args.externalBankAccountGuid, "eba-guid-1");
    });
});

describe("CybridClient.deposit addresses", () => {

    beforeEach(() => {
        mockCreateDepositAddress.mock.resetCalls();
    });

    it("createDepositAddress should forward the body", async () => {
        const body = { account_guid: "acct-1" };
        const result = await CybridClient.createDepositAddress(body as never);
        assert.equal(result.guid, "dep-addr-1");
        const args = mockCreateDepositAddress.mock.calls[0]!.arguments[0] as Record<string, unknown>;
        assert.deepEqual(args.postDepositAddressBankModel, body);
    });
});

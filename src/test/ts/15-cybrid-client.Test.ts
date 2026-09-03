import { describe, it, after, mock } from "node:test";
import assert from "node:assert/strict";
import { of } from "rxjs";
import { HTMLStatusError } from "../../main/ts/libs/HTMLStatusError.ts";

process.env.CYBRID_CLIENT_ID = "test-client-id";
process.env.CYBRID_CLIENT_SECRET = "test-client-secret";

// --- Cybrid SDK doubles ------------------------------------------------------
// The real SDK talks to Cybrid over HTTP (via xhr2) and returns RxJS
// observables; we replace it with in-memory fakes whose methods emit `of(...)`
// so `firstValueFrom` in the client resolves synchronously. Tests steer the
// responses through the mutable module-level state below.

let accountsByGuid: Record<string, { guid: string; asset?: string; customer_guid?: string; bank_guid?: string }> = {};
let quoteResult: { guid?: string } = { guid: "quote-guid-1" };
let transferResult: { guid: string } = { guid: "transfer-guid-1" };
let lastTransferInput: {
    quote_guid: string;
    transfer_type: string;
    source_participants: Array<{ type: string; amount: number; guid: string }>;
    destination_participants: Array<{ type: string; amount: number; guid: string }>;
} | null = null;

// --- Token endpoint double ---------------------------------------------------
let authCallCount = 0;
let authOk = true;
let authExpiresIn = 3600;
const realFetch = globalThis.fetch;
globalThis.fetch = (async () => {
    authCallCount += 1;
    if (!authOk) {
        return { ok: false, status: 401, json: async () => ({}) } as unknown as Response;
    }
    return {
        ok: true,
        status: 200,
        json: async () => ({
            access_token: `token-${authCallCount}`,
            token_type: "Bearer",
            expires_in: authExpiresIn,
        }),
    } as unknown as Response;
}) as typeof fetch;

// CybridClient statically imports every *BankApi class as a value; ES named
// imports are linked up front, so a missing binding is a load-time error even
// for classes these tests never exercise. Stub the unused ones, and give the
// three the book-transfer path uses (accounts, quotes, transfers) real fakes.
const unusedApis = [
    "CustomersBankApi",
    "TradesBankApi",
    "IdentityVerificationsBankApi",
    "SymbolsBankApi",
    "AssetsBankApi",
    "PricesBankApi",
    "DepositAddressesBankApi",
    "DepositBankAccountsBankApi",
    "ExternalBankAccountsBankApi",
    "ExternalWalletsBankApi",
    "WorkflowsBankApi",
    "BanksBankApi",
    "CounterpartiesBankApi",
    "PersonaSessionsBankApi",
    "FilesBankApi",
    "ExecutionsBankApi",
    "InvoicesBankApi",
    "PaymentInstructionsBankApi",
    "PlansBankApi",
];
const apiStubs = Object.fromEntries(unusedApis.map((name) => [name, class {}]));

mock.module("@cybrid/cybrid-api-bank-typescript", {
    namedExports: {
        ...apiStubs,
        Configuration: class {},
        AccountsBankApi: class {
            getAccount({ accountGuid }: { accountGuid: string }) {
                return of(accountsByGuid[accountGuid] ?? { guid: accountGuid });
            }
        },
        QuotesBankApi: class {
            createQuote() {
                return of(quoteResult);
            }
        },
        TransfersBankApi: class {
            createTransfer({ postTransferBankModel }: { postTransferBankModel: typeof lastTransferInput }) {
                lastTransferInput = postTransferBankModel;
                return of(transferResult);
            }
        },
        PostQuoteBankModelProductTypeEnum: { BookTransfer: "book_transfer" },
        PostTransferBankModelTransferTypeEnum: { Book: "book" },
        PostTransferParticipantBankModelTypeEnum: { Customer: "customer", Bank: "bank" },
    },
});

const CybridClient = await import("../../main/ts/libs/CybridClient.ts");

function isStatus(status: number) {
    return (error: unknown) => error instanceof HTMLStatusError && error.statusCode === status;
}

describe("CybridClient OAuth token handling", () => {
    it("throws 500 when the auth endpoint responds with an error", async () => {
        authOk = false;
        await assert.rejects(CybridClient.getAccount("acc-1"), isStatus(500));
    });

    it("caches the access token and reuses it across API calls", async () => {
        authOk = true;
        authExpiresIn = 3600;
        authCallCount = 0;
        accountsByGuid = { "acc-1": { guid: "acc-1", asset: "USD" } };

        await CybridClient.getAccount("acc-1");
        await CybridClient.getAccount("acc-1");

        assert.equal(authCallCount, 1, "token should be fetched once and reused");
    });
});

describe("CybridClient.createBookTransfer", () => {
    it("rejects mismatched source and destination assets with 400", async () => {
        accountsByGuid = {
            src: { guid: "src", asset: "USD", customer_guid: "cust-src" },
            dst: { guid: "dst", asset: "BTC", customer_guid: "cust-dst" },
        };
        await assert.rejects(CybridClient.createBookTransfer("src", "dst", 1000), isStatus(400));
    });

    it("rejects a requested asset that does not match the account asset with 400", async () => {
        accountsByGuid = {
            src: { guid: "src", asset: "USD", customer_guid: "cust-src" },
            dst: { guid: "dst", asset: "USD", customer_guid: "cust-dst" },
        };
        await assert.rejects(CybridClient.createBookTransfer("src", "dst", 1000, "EUR"), isStatus(400));
    });

    it("throws 500 when the created quote has no guid", async () => {
        accountsByGuid = {
            src: { guid: "src", asset: "USD", customer_guid: "cust-src" },
            dst: { guid: "dst", asset: "USD", customer_guid: "cust-dst" },
        };
        quoteResult = {};
        await assert.rejects(CybridClient.createBookTransfer("src", "dst", 1000), isStatus(500));
    });

    it("resolves customer- and bank-owned participants on the happy path", async () => {
        accountsByGuid = {
            src: { guid: "src", asset: "USD", customer_guid: "cust-src" },
            dst: { guid: "dst", asset: "USD", bank_guid: "bank-dst" },
        };
        quoteResult = { guid: "quote-1" };
        transferResult = { guid: "transfer-1" };

        const transfer = await CybridClient.createBookTransfer("src", "dst", 2500, "USD");

        assert.equal(transfer.guid, "transfer-1");
        assert.equal(lastTransferInput?.quote_guid, "quote-1");
        assert.equal(lastTransferInput?.transfer_type, "book");
        assert.deepEqual(lastTransferInput?.source_participants, [
            { type: "customer", amount: 2500, guid: "cust-src" },
        ]);
        assert.deepEqual(lastTransferInput?.destination_participants, [
            { type: "bank", amount: 2500, guid: "bank-dst" },
        ]);
    });

    it("throws 500 when an account has neither a customer nor a bank guid", async () => {
        accountsByGuid = {
            src: { guid: "src", asset: "USD" },
            dst: { guid: "dst", asset: "USD", customer_guid: "cust-dst" },
        };
        quoteResult = { guid: "quote-1" };
        await assert.rejects(CybridClient.createBookTransfer("src", "dst", 1000), isStatus(500));
    });
});

after(() => {
    globalThis.fetch = realFetch;
});

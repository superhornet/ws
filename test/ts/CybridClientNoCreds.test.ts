import { describe, it, mock, after } from "node:test";
import assert from "node:assert/strict";
import { Observable, of } from "rxjs";
import { HTMLStatusError } from "../../src/main/ts/libs/HTMLStatusError.ts";

// Force empty credentials BEFORE CybridClient runs dotenv.config(). dotenv
// does not overwrite existing process.env entries, so these empty strings
// win over the real `.env` values — the module captures them at load time.
process.env.CYBRID_CLIENT_ID = "";
process.env.CYBRID_CLIENT_SECRET = "";
process.env.CYBRID_AUTH_URL = "https://auth.test.invalid/oauth/token";
process.env.CYBRID_API_BASE = "https://api.test.invalid";

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
const mockFetch = mock.fn<FetchFn>(async () => {
    throw new Error("fetch must not be called when credentials are missing");
});
const originalFetch = globalThis.fetch;
(globalThis as { fetch: FetchFn }).fetch = mockFetch;

type ObservableFn = (arg?: unknown) => Observable<unknown>;
const mockListSymbols = mock.fn<ObservableFn>(() => of([]));

mock.module("@cybrid/cybrid-api-bank-typescript", {
    namedExports: {
        Configuration: class {},
        CustomersBankApi: class {},
        AccountsBankApi: class {},
        QuotesBankApi: class {},
        TradesBankApi: class {},
        TransfersBankApi: class {},
        IdentityVerificationsBankApi: class {},
        SymbolsBankApi: class { listSymbols = mockListSymbols; },
        AssetsBankApi: class {},
        PricesBankApi: class {},
        DepositAddressesBankApi: class {},
        DepositBankAccountsBankApi: class {},
        ExternalBankAccountsBankApi: class {},
        ExternalWalletsBankApi: class {},
        WorkflowsBankApi: class {},
        BanksBankApi: class {},
        CounterpartiesBankApi: class {},
        PersonaSessionsBankApi: class {},
        FilesBankApi: class {},
        ExecutionsBankApi: class {},
        InvoicesBankApi: class {},
        PaymentInstructionsBankApi: class {},
        PlansBankApi: class {},
        PostQuoteBankModelProductTypeEnum: {},
        PostTransferBankModelTransferTypeEnum: {},
        PostTransferParticipantBankModelTypeEnum: {},
    },
});

const CybridClient = await import("../../src/main/ts/libs/CybridClient.ts");

after(() => {
    (globalThis as { fetch: FetchFn }).fetch = originalFetch;
});

describe("CybridClient.getAccessToken — missing credentials", () => {
    it("throws HTMLStatusError(500) when CYBRID_CLIENT_ID/SECRET are empty", async () => {
        await assert.rejects(
            () => CybridClient.listSymbols(),
            (error: HTMLStatusError) => {
                assert.equal(error.statusCode, 500);
                assert.match(error.message, /credentials not configured/);
                return true;
            },
        );
        // Should short-circuit before hitting the network.
        assert.equal(mockFetch.mock.callCount(), 0);
    });
});

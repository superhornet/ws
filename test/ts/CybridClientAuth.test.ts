import { describe, it, mock, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { Observable, of } from "rxjs";
import { HTMLStatusError } from "../../src/main/ts/libs/HTMLStatusError.ts";

// Ensure known credentials and auth URL BEFORE CybridClient imports dotenv.
// dotenv.config() does not overwrite existing process.env entries, so assigning
// here wins over whatever `.env` holds.
process.env.CYBRID_CLIENT_ID = "test-client-id";
process.env.CYBRID_CLIENT_SECRET = "test-client-secret";
process.env.CYBRID_AUTH_URL = "https://auth.test.invalid/oauth/token";
process.env.CYBRID_API_BASE = "https://api.test.invalid";

// Stub globalThis.fetch BEFORE importing CybridClient so the first (cold-cache)
// call is intercepted cleanly.
type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
const mockFetch = mock.fn<FetchFn>(async () => {
    throw new Error("mockFetch implementation not set for this test");
});
const originalFetch = globalThis.fetch;
(globalThis as { fetch: FetchFn }).fetch = mockFetch;

// Minimal SDK stub. listSymbols is the simplest trigger for
// getConfiguration → getAccessToken → fetch.
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

function tokenResponse(accessToken: string, expiresIn: number): Response {
    return {
        ok: true,
        status: 200,
        json: async () => ({
            access_token: accessToken,
            token_type: "Bearer",
            expires_in: expiresIn,
        }),
    } as Response;
}

describe("CybridClient.getAccessToken — OAuth token caching", () => {

    beforeEach(() => {
        mockFetch.mock.resetCalls();
        mockListSymbols.mock.resetCalls();
    });

    it("fetches a token once and reuses the cached one within TTL", async (t) => {
        // Freeze time far in the future so any cached tokenExpiresAt from a
        // prior test is guaranteed to be stale at this test's start.
        t.mock.timers.enable({ apis: ["Date"], now: 10_000_000_000_000 });
        mockFetch.mock.mockImplementation(async () => tokenResponse("tok-cached", 3600));

        await CybridClient.listSymbols();
        await CybridClient.listSymbols();
        await CybridClient.listSymbols();

        assert.equal(mockFetch.mock.callCount(), 1);
        assert.equal(mockListSymbols.mock.callCount(), 3);
    });

    it("re-fetches the token once it expires", async (t) => {
        t.mock.timers.enable({ apis: ["Date"], now: 20_000_000_000_000 });
        mockFetch.mock.mockImplementation(async () => tokenResponse("tok-old", 3600));

        await CybridClient.listSymbols();
        assert.equal(mockFetch.mock.callCount(), 1);

        // CybridClient subtracts a 60s buffer from expires_in, so after
        // 3600-60=3540 seconds the cached token is considered stale.
        t.mock.timers.tick(3541 * 1000);

        mockFetch.mock.mockImplementation(async () => tokenResponse("tok-fresh", 3600));
        await CybridClient.listSymbols();

        assert.equal(mockFetch.mock.callCount(), 2);
    });

    it("POSTs client_credentials grant with the configured credentials", async (t) => {
        t.mock.timers.enable({ apis: ["Date"], now: 30_000_000_000_000 });
        mockFetch.mock.mockImplementation(async () => tokenResponse("tok", 3600));

        await CybridClient.listSymbols();

        const call = mockFetch.mock.calls[0]!;
        const url = call.arguments[0];
        const init = call.arguments[1] as RequestInit;
        assert.equal(url, "https://auth.test.invalid/oauth/token");
        assert.equal(init.method, "POST");
        const body = JSON.parse(init.body as string) as Record<string, unknown>;
        assert.equal(body.grant_type, "client_credentials");
        assert.equal(body.client_id, "test-client-id");
        assert.equal(body.client_secret, "test-client-secret");
    });

    it("throws HTMLStatusError(500) when the auth endpoint returns non-OK", async (t) => {
        t.mock.timers.enable({ apis: ["Date"], now: 40_000_000_000_000 });
        mockFetch.mock.mockImplementation(async () => ({
            ok: false,
            status: 401,
            json: async () => ({}),
        } as Response));

        await assert.rejects(
            () => CybridClient.listSymbols(),
            (error: HTMLStatusError) => {
                assert.equal(error.statusCode, 500);
                assert.match(error.message, /Cybrid auth failed.*401/);
                return true;
            },
        );
    });
});

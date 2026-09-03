import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";

process.env.PRIVY_APP_ID = "test-app-id";
process.env.PRIVY_APP_SECRET = "test-app-secret";
delete process.env.PRIVY_API_URL;

// --- Privy SDK double --------------------------------------------------------
// Replaces `@privy-io/node` so no real HTTP happens. The client is constructed
// lazily and cached, so we count constructions to assert the singleton, and
// capture the calls to assert delegation and the list-page mapping.

let constructCount = 0;
let lastConstructArgs: { appId?: string; appSecret?: string; apiUrl?: string } | null = null;
let lastCreateInput: unknown = null;
let lastGetId: string | null = null;
let lastListQuery: unknown = null;

mock.module("@privy-io/node", {
    namedExports: {
        PrivyClient: class {
            constructor(args: { appId?: string; appSecret?: string; apiUrl?: string }) {
                constructCount += 1;
                lastConstructArgs = args;
            }
            wallets() {
                return {
                    create: async (input: unknown) => {
                        lastCreateInput = input;
                        return { id: "wallet-1", chain_type: "ethereum" };
                    },
                    get: async (walletId: string) => {
                        lastGetId = walletId;
                        return { id: walletId };
                    },
                    list: async (query: unknown) => {
                        lastListQuery = query;
                        return { data: [{ id: "wallet-1" }, { id: "wallet-2" }], next_cursor: "cursor-1" };
                    },
                };
            }
        },
    },
});

const PrivyClient = await import("../../main/ts/libs/PrivyClient.ts");

describe("PrivyClient wallet delegation", () => {
    it("creates a wallet through the SDK and returns it", async () => {
        const input = { chain_type: "ethereum", external_id: "user-1" } as never;
        const wallet = await PrivyClient.createWallet(input);
        assert.equal(wallet.id, "wallet-1");
        assert.deepEqual(lastCreateInput, input);
    });

    it("gets a wallet by id through the SDK", async () => {
        const wallet = await PrivyClient.getWallet("wallet-42");
        assert.equal(wallet.id, "wallet-42");
        assert.equal(lastGetId, "wallet-42");
    });

    it("maps the list page to data and next_cursor", async () => {
        const query = { external_id: "user-1", limit: 25 } as never;
        const page = await PrivyClient.listWallets(query);
        assert.deepEqual(page, {
            data: [{ id: "wallet-1" }, { id: "wallet-2" }],
            next_cursor: "cursor-1",
        });
        assert.deepEqual(lastListQuery, query);
    });
});

describe("PrivyClient construction", () => {
    it("constructs a single client and reuses it across calls", async () => {
        const before = constructCount;
        await PrivyClient.getWallet("wallet-a");
        await PrivyClient.getWallet("wallet-b");
        await PrivyClient.listWallets({} as never);
        assert.equal(constructCount, before, "client should be constructed once and cached");
    });

    it("passes the configured app credentials and omits apiUrl when unset", () => {
        assert.equal(lastConstructArgs?.appId, "test-app-id");
        assert.equal(lastConstructArgs?.appSecret, "test-app-secret");
        assert.equal("apiUrl" in (lastConstructArgs ?? {}), false);
    });
});

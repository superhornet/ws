import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { HTMLStatusError } from "../../src/main/ts/libs/HTMLStatusError.ts";
import type { WalletChainType } from "../../src/main/ts/types/PrivyAPITypes.ts";

// --- Client method mocks ---

type AnyFn = (...args: unknown[]) => Promise<unknown>;
const fn = () => mock.fn<AnyFn>();

const mockCreateWallet = fn();
const mockGetWallet = fn();
const mockListWallets = fn();

mock.module("../../src/main/ts/libs/PrivyClient.ts", {
    namedExports: {
        createWallet: mockCreateWallet,
        getWallet: mockGetWallet,
        listWallets: mockListWallets,
    },
});

const { Privy } = await import("../../src/main/ts/models/Privy.ts");

// --- Helpers ---

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

// --- createWallet ---

describe("Privy.createWallet", () => {
    const mockWallet = { id: "wallet-123", address: "0xabc", chain_type: "ethereum" };

    beforeEach(() => {
        mockCreateWallet.mock.resetCalls();
        mockCreateWallet.mock.mockImplementation(async () => mockWallet);
    });

    it("should throw 400 for an unsupported chain type", async () => {
        await expectBadRequest(
            Privy.createWallet({ chain_type: "bitcoin" as WalletChainType }),
            /chain type/i,
        );
    });

    it("should not call the client when the chain type is invalid", async () => {
        await Privy.createWallet({ chain_type: "bitcoin" as WalletChainType }).catch(() => undefined);
        assert.equal(mockCreateWallet.mock.callCount(), 0);
    });

    it("should forward a valid input to the client", async () => {
        const input = { chain_type: "ethereum" as WalletChainType, owner: { user_id: "user-1" } };
        const result = await Privy.createWallet(input);
        assert.equal(mockCreateWallet.mock.callCount(), 1);
        assert.deepEqual(mockCreateWallet.mock.calls[0]!.arguments[0], input);
        assert.equal(result.id, "wallet-123");
    });

    it("should wrap non-HTMLStatusError as 500", async () => {
        mockCreateWallet.mock.mockImplementation(async () => {
            throw new Error("Privy down");
        });
        await expectWrappedError(Privy.createWallet({ chain_type: "ethereum" }), /Privy down/);
    });
});

// --- getWallet ---

describe("Privy.getWallet", () => {
    beforeEach(() => {
        mockGetWallet.mock.resetCalls();
        mockGetWallet.mock.mockImplementation(async () => ({ id: "wallet-123" }));
    });

    it("should throw 400 when the wallet id is empty", async () => {
        await expectBadRequest(Privy.getWallet(""), /Wallet ID/);
    });

    it("should not call the client when the wallet id is empty", async () => {
        await Privy.getWallet("").catch(() => undefined);
        assert.equal(mockGetWallet.mock.callCount(), 0);
    });

    it("should forward the wallet id to the client", async () => {
        await Privy.getWallet("wallet-123");
        assert.equal(mockGetWallet.mock.callCount(), 1);
        assert.equal(mockGetWallet.mock.calls[0]!.arguments[0], "wallet-123");
    });

    it("should wrap non-HTMLStatusError as 500", async () => {
        mockGetWallet.mock.mockImplementation(async () => {
            throw new Error("Privy down");
        });
        await expectWrappedError(Privy.getWallet("wallet-123"), /Privy down/);
    });
});

// --- listWallets ---

describe("Privy.listWallets", () => {
    beforeEach(() => {
        mockListWallets.mock.resetCalls();
        mockListWallets.mock.mockImplementation(async () => ({ data: [], next_cursor: "" }));
    });

    it("should forward the query to the client", async () => {
        const query = { user_id: "user-1", chain_type: "ethereum" as WalletChainType };
        await Privy.listWallets(query);
        assert.equal(mockListWallets.mock.callCount(), 1);
        assert.deepEqual(mockListWallets.mock.calls[0]!.arguments[0], query);
    });

    it("should wrap non-HTMLStatusError as 500", async () => {
        mockListWallets.mock.mockImplementation(async () => {
            throw new Error("Privy down");
        });
        await expectWrappedError(Privy.listWallets({}), /Privy down/);
    });
});

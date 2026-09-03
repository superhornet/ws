import { after, describe, test, mock } from "node:test";
import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { router as sessionRouter } from "../../main/ts/controllers/SessionController.ts";
import { router as userRouter } from "../../main/ts/controllers/UserController.ts";
import { SubscriptionType } from "../../main/ts/types/SubscriptionTypes.ts";
import type { WalletCreateInput, WalletListQuery } from "../../main/ts/types/PrivyAPITypes.ts";
import { findRouteHandler, mockGetRequest, mockSession, mockUser } from "./mocks.ts";

// Run-unique suffix so re-running against a persistent DB does not collide on
// the users' unique email constraint.
const RUN = Date.now();

let sharedSession: string = "";

// Captured inputs / configurable outputs for the mocked Privy model. The real
// model calls the hosted Privy SDK; mocking only this module lets the bound-user
// tests below assert the controller's authorization behavior (server-controlled
// `external_id` stamping / scoping / ownership check) without any network. The
// session/user/audit/DB layers stay real, so binding is exercised end-to-end.
let createWalletInput: WalletCreateInput | null = null;
let listWalletsQuery: WalletListQuery | null = null;
let getWalletExternalId = "";

mock.module("../../main/ts/models/Privy.ts", {
    namedExports: {
        Privy: class {
            static async createWallet(input: WalletCreateInput) {
                createWalletInput = input;
                return { id: "wallet-1", chain_type: input.chain_type, external_id: input.external_id };
            }
            static async getWallet(walletId: string) {
                return { id: walletId, chain_type: "ethereum", external_id: getWalletExternalId };
            }
            static async listWallets(query: WalletListQuery) {
                listWalletsQuery = query;
                return { data: [], next_cursor: null };
            }
        },
    },
});

// Imported after the mock is installed so the controller binds to the mocked
// Privy model (static imports would hoist above `mock.module`).
const { router: privyRouter } = await import("../../main/ts/controllers/PrivyController.ts");

/**
 * The session-missing / unbound cases exercise the validation/authorization
 * layer (requireBody / getSession / requireWalletOwner -> requireActingUser),
 * which rejects before `Privy.*`. The bound-user cases sign up a real user so the
 * session resolves to them, then assert the controller's `external_id` scoping
 * and ownership check against the mocked Privy model.
 *
 * Session is read from the `X-Session` header on every route (create, read, and
 * list), so the "session missing" cases send no header rather than a body field.
 */
async function createSession(): Promise<string> {
    const handler = findRouteHandler(sessionRouter, 'get', '/session');
    assert.ok(handler, "Missing handler for session get");
    const { req, res } = mockSession();
    // @ts-expect-error req is fine as-is
    await handler(req, res, () => null);
    return (res.body.data).uuid;
}

/**
 * Signs up a fresh user on its own session so the session is bound to that user,
 * returning the session and the user_identifier the routes scope wallets to.
 */
async function createBoundSession(label: string): Promise<{ session: string; userIdentifier: string }> {
    const session = await createSession();
    const handler = findRouteHandler(userRouter, 'post', '/user');
    assert.ok(handler, "Missing handler for user post");
    const { req, res } = mockUser({
        body: {
            data: {
                firstname: "Privy",
                lastname: "Tester",
                email: `${label}.${RUN}@westack.cash`,
                address1: "1 Test St",
                address2: "",
                city: "Testville",
                state: "FL",
                zipcode: "33101",
                subscription_level: SubscriptionType.PRO,
            },
            message: `Signup ${label}`,
            session,
        },
    });
    // @ts-expect-error req is fine as-is
    await handler(req, res, null);
    assert.equal(res.statusCode, 201);
    return { session, userIdentifier: (res.body.data as { user_identifier: string }).user_identifier };
}

describe("Get a session", async () => {
    sharedSession = await createSession();
});

describe("POST /api/privy/wallet body and session validation", () => {
    test("is 400 Empty JSON body when the body is missing", async () => {
        const handler = findRouteHandler(privyRouter, 'post', '/privy/wallet');
        assert.ok(handler, "Missing handler for POST /privy/wallet");
        const { req, res } = mockGetRequest({});
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Empty JSON body');
    });

    test("is 403 Session ID Required when the header is missing", async () => {
        const handler = findRouteHandler(privyRouter, 'post', '/privy/wallet');
        assert.ok(handler, "Missing handler for POST /privy/wallet");
        const { req, res } = mockGetRequest({ body: { chain_type: "ethereum" } });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session ID Required');
    });

    test("is 403 when the session is valid but unbound", async () => {
        const handler = findRouteHandler(privyRouter, 'post', '/privy/wallet');
        assert.ok(handler, "Missing handler for POST /privy/wallet");
        const { req, res } = mockGetRequest({ headers: { "x-session": sharedSession }, body: { chain_type: "ethereum" } });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session is not associated with a user');
    });
});

describe("GET /api/privy/wallet/:wallet_id session and ownership validation", () => {
    test("is 403 Session ID Required when the header is missing", async () => {
        const handler = findRouteHandler(privyRouter, 'get', '/privy/wallet/:wallet_id');
        assert.ok(handler, "Missing handler for GET /privy/wallet/:wallet_id");
        const { req, res } = mockGetRequest({ params: { wallet_id: randomUUID() } });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session ID Required');
    });

    test("is 403 when the session is valid but unbound", async () => {
        const handler = findRouteHandler(privyRouter, 'get', '/privy/wallet/:wallet_id');
        assert.ok(handler, "Missing handler for GET /privy/wallet/:wallet_id");
        const { req, res } = mockGetRequest({ headers: { "x-session": sharedSession }, params: { wallet_id: randomUUID() } });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session is not associated with a user');
    });
});

describe("GET /api/privy/wallets session validation", () => {
    test("is 403 Session ID Required when the header is missing", async () => {
        const handler = findRouteHandler(privyRouter, 'get', '/privy/wallets');
        assert.ok(handler, "Missing handler for GET /privy/wallets");
        const { req, res } = mockGetRequest({});
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session ID Required');
    });

    test("is 403 when the session is valid but unbound", async () => {
        const handler = findRouteHandler(privyRouter, 'get', '/privy/wallets');
        assert.ok(handler, "Missing handler for GET /privy/wallets");
        const { req, res } = mockGetRequest({ headers: { "x-session": sharedSession } });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session is not associated with a user');
    });
});

describe("Privy wallet routes scope to the acting user (bound session)", () => {
    test("POST /privy/wallet stamps external_id from the acting user, ignoring client input", async () => {
        const { session, userIdentifier } = await createBoundSession("create");
        const handler = findRouteHandler(privyRouter, 'post', '/privy/wallet');
        assert.ok(handler, "Missing handler for POST /privy/wallet");
        const { req, res } = mockGetRequest({
            headers: { "x-session": session },
            // A client-supplied external_id/owner must be ignored by the controller.
            body: { chain_type: "ethereum", external_id: "attacker-controlled", display_name: "My Wallet" },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 201);
        assert.ok(createWalletInput, "Privy.createWallet should have been called");
        assert.equal(createWalletInput.external_id, userIdentifier);
        assert.equal(createWalletInput.chain_type, "ethereum");
        assert.equal(createWalletInput.display_name, "My Wallet");
    });

    test("GET /privy/wallets forces the list query to the acting user's external_id", async () => {
        const { session, userIdentifier } = await createBoundSession("list");
        const handler = findRouteHandler(privyRouter, 'get', '/privy/wallets');
        assert.ok(handler, "Missing handler for GET /privy/wallets");
        const { req, res } = mockGetRequest({
            headers: { "x-session": session },
            // A client-supplied external_id filter must be overridden.
            query: { external_id: "attacker-controlled", chain_type: "solana", limit: "5" },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 200);
        assert.ok(listWalletsQuery, "Privy.listWallets should have been called");
        assert.equal(listWalletsQuery.external_id, userIdentifier);
        assert.equal(listWalletsQuery.chain_type, "solana");
        assert.equal(listWalletsQuery.limit, 5);
    });

    test("GET /privy/wallet/:wallet_id returns the wallet when it belongs to the acting user", async () => {
        const { session, userIdentifier } = await createBoundSession("read-own");
        getWalletExternalId = userIdentifier;
        const handler = findRouteHandler(privyRouter, 'get', '/privy/wallet/:wallet_id');
        assert.ok(handler, "Missing handler for GET /privy/wallet/:wallet_id");
        const { req, res } = mockGetRequest({ headers: { "x-session": session }, params: { wallet_id: "wallet-1" } });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 200);
    });

    test("GET /privy/wallet/:wallet_id is 403 Forbidden when the wallet belongs to another user", async () => {
        const { session } = await createBoundSession("read-other");
        getWalletExternalId = "some-other-user";
        const handler = findRouteHandler(privyRouter, 'get', '/privy/wallet/:wallet_id');
        assert.ok(handler, "Missing handler for GET /privy/wallet/:wallet_id");
        const { req, res } = mockGetRequest({ headers: { "x-session": session }, params: { wallet_id: "wallet-1" } });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, "Forbidden");
    });
});

after(() => {
    console.log("Tests complete");
    setTimeout(() => {
        process.emit('beforeExit', 0);
    }, 100);
});

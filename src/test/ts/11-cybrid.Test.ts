import { after, describe, test } from "node:test";
import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { router as sessionRouter } from "../../main/ts/controllers/SessionController.ts";
import { router as cybridRouter } from "../../main/ts/controllers/CybridController.ts";
import { findRouteHandler, mockGetRequest, mockSession } from "./mocks.ts";

let sharedSession: string = "";

/**
 * The Cybrid routes never reach the Cybrid API in this suite: every test below
 * exercises the validation layer (requireBody / getSession / requireGuid and the
 * fiat-transfer amount rules), all of which reject before `Cybrid.*` is invoked.
 */
async function createSession(): Promise<string> {
    const handler = findRouteHandler(sessionRouter, 'get', '/session');
    assert.ok(handler, "Missing handler for session get");
    const { req, res } = mockSession();
    // @ts-expect-error req is fine as-is
    await handler(req, res, () => null);
    return (res.body.data).uuid;
}

describe("Get a session", async () => {
    sharedSession = await createSession();
});

// POST routes guarded by requireBody + getSession (X-Session header).
const postBodyRoutes = [
    "/cybrid/account",
    "/cybrid/counterparty",
    "/cybrid/customer",
    "/cybrid/deposit-address",
    "/cybrid/deposit-bank-account",
    "/cybrid/execution",
    "/cybrid/external-bank-account",
    "/cybrid/external-wallet",
    "/cybrid/fiat-transfer",
    "/cybrid/file",
    "/cybrid/identity-verification",
    "/cybrid/invoice",
    "/cybrid/payment-instruction",
    "/cybrid/persona-session",
    "/cybrid/plan",
    "/cybrid/quote",
    "/cybrid/trade",
    "/cybrid/transfer",
    "/cybrid/workflow",
];

// PATCH routes guarded by requireBody + getSession (X-Session header) + requireGuid.
const patchGuidRoutes = [
    { path: "/cybrid/customer/:customer_guid", label: "Customer" },
    { path: "/cybrid/external-bank-account/:external_bank_account_guid", label: "External Bank Account" },
    { path: "/cybrid/transfer/:transfer_guid", label: "Transfer" },
];

// GET single-resource routes guarded by getSession + requireGuid.
const getGuidRoutes = [
    { path: "/cybrid/account/:account_guid", label: "Account" },
    { path: "/cybrid/counterparty/:counterparty_guid", label: "Counterparty" },
    { path: "/cybrid/customer/:customer_guid", label: "Customer" },
    { path: "/cybrid/deposit-address/:deposit_address_guid", label: "Deposit Address" },
    { path: "/cybrid/deposit-bank-account/:deposit_bank_account_guid", label: "Deposit Bank Account" },
    { path: "/cybrid/execution/:execution_guid", label: "Execution" },
    { path: "/cybrid/external-bank-account/:external_bank_account_guid", label: "External Bank Account" },
    { path: "/cybrid/external-wallet/:external_wallet_guid", label: "External Wallet" },
    { path: "/cybrid/file/:file_guid", label: "File" },
    { path: "/cybrid/identity-verification/:verification_guid", label: "Verification" },
    { path: "/cybrid/invoice/:invoice_guid", label: "Invoice" },
    { path: "/cybrid/payment-instruction/:payment_instruction_guid", label: "Payment Instruction" },
    { path: "/cybrid/plan/:plan_guid", label: "Plan" },
    { path: "/cybrid/quote/:quote_guid", label: "Quote" },
    { path: "/cybrid/trade/:trade_guid", label: "Trade" },
    { path: "/cybrid/transfer/:transfer_guid", label: "Transfer" },
    { path: "/cybrid/workflow/:workflow_guid", label: "Workflow" },
];

// DELETE routes guarded by getSession + requireGuid.
const deleteGuidRoutes = [
    { path: "/cybrid/external-bank-account/:external_bank_account_guid", label: "External Bank Account" },
    { path: "/cybrid/external-wallet/:external_wallet_guid", label: "External Wallet" },
    { path: "/cybrid/invoice/:invoice_guid", label: "Invoice" },
];

// GET list routes guarded by getSession only.
const getListRoutes = [
    "/cybrid/accounts",
    "/cybrid/assets",
    "/cybrid/counterparties",
    "/cybrid/deposit-addresses",
    "/cybrid/deposit-bank-accounts",
    "/cybrid/executions",
    "/cybrid/external-bank-accounts",
    "/cybrid/external-wallets",
    "/cybrid/files",
    "/cybrid/identity-verifications",
    "/cybrid/invoices",
    "/cybrid/payment-instructions",
    "/cybrid/plans",
    "/cybrid/prices",
    "/cybrid/quotes",
    "/cybrid/symbols",
    "/cybrid/trades",
    "/cybrid/transfers",
    "/cybrid/workflows",
];

describe("POST /api/cybrid/* body and session validation", () => {
    for (const path of postBodyRoutes) {
        test(`POST ${path} is 400 Empty JSON body when the body is missing`, async () => {
            const handler = findRouteHandler(cybridRouter, 'post', path);
            assert.ok(handler, `Missing handler for POST ${path}`);
            const { req, res } = mockGetRequest({});
            // @ts-expect-error req is fine as-is
            await handler(req, res, null);
            assert.equal(res.statusCode, 400);
            assert.equal(res.body.message, 'Empty JSON body');
        });
        test(`POST ${path} is 403 Session ID Required when the session is missing`, async () => {
            const handler = findRouteHandler(cybridRouter, 'post', path);
            assert.ok(handler, `Missing handler for POST ${path}`);
            const { req, res } = mockGetRequest({ body: { message: "No session supplied" } });
            // @ts-expect-error req is fine as-is
            await handler(req, res, null);
            assert.equal(res.statusCode, 403);
            assert.equal(res.body.message, 'Session ID Required');
        });
    }
});

describe("PATCH /api/cybrid/* body, session, and GUID validation", () => {
    for (const { path, label } of patchGuidRoutes) {
        test(`PATCH ${path} is 400 Empty JSON body when the body is missing`, async () => {
            const handler = findRouteHandler(cybridRouter, 'patch', path);
            assert.ok(handler, `Missing handler for PATCH ${path}`);
            const { req, res } = mockGetRequest({});
            // @ts-expect-error req is fine as-is
            await handler(req, res, null);
            assert.equal(res.statusCode, 400);
            assert.equal(res.body.message, 'Empty JSON body');
        });
        test(`PATCH ${path} is 403 Session ID Required when the session is missing`, async () => {
            const handler = findRouteHandler(cybridRouter, 'patch', path);
            assert.ok(handler, `Missing handler for PATCH ${path}`);
            const { req, res } = mockGetRequest({ body: { message: "No session supplied" } });
            // @ts-expect-error req is fine as-is
            await handler(req, res, null);
            assert.equal(res.statusCode, 403);
            assert.equal(res.body.message, 'Session ID Required');
        });
        test(`PATCH ${path} is 400 when the GUID is missing`, async () => {
            const handler = findRouteHandler(cybridRouter, 'patch', path);
            assert.ok(handler, `Missing handler for PATCH ${path}`);
            const { req, res } = mockGetRequest({ headers: { "x-session": sharedSession }, body: { message: "x" }, params: {} });
            // @ts-expect-error req is fine as-is
            await handler(req, res, null);
            assert.equal(res.statusCode, 400);
            assert.equal(res.body.message, `${label} GUID is required`);
        });
    }
});

describe("GET /api/cybrid/:guid session and GUID validation", () => {
    for (const { path, label } of getGuidRoutes) {
        test(`GET ${path} is 403 Session ID Required when the header is missing`, async () => {
            const handler = findRouteHandler(cybridRouter, 'get', path);
            assert.ok(handler, `Missing handler for GET ${path}`);
            const { req, res } = mockGetRequest({});
            // @ts-expect-error req is fine as-is
            await handler(req, res, null);
            assert.equal(res.statusCode, 403);
            assert.equal(res.body.message, 'Session ID Required');
        });
        test(`GET ${path} is 400 when the GUID is missing`, async () => {
            const handler = findRouteHandler(cybridRouter, 'get', path);
            assert.ok(handler, `Missing handler for GET ${path}`);
            const { req, res } = mockGetRequest({ headers: { "x-session": sharedSession }, params: {} });
            // @ts-expect-error req is fine as-is
            await handler(req, res, null);
            assert.equal(res.statusCode, 400);
            assert.equal(res.body.message, `${label} GUID is required`);
        });
    }
});

describe("DELETE /api/cybrid/:guid session and GUID validation", () => {
    for (const { path, label } of deleteGuidRoutes) {
        test(`DELETE ${path} is 403 Session ID Required when the header is missing`, async () => {
            const handler = findRouteHandler(cybridRouter, 'delete', path);
            assert.ok(handler, `Missing handler for DELETE ${path}`);
            const { req, res } = mockGetRequest({});
            // @ts-expect-error req is fine as-is
            await handler(req, res, null);
            assert.equal(res.statusCode, 403);
            assert.equal(res.body.message, 'Session ID Required');
        });
        test(`DELETE ${path} is 400 when the GUID is missing`, async () => {
            const handler = findRouteHandler(cybridRouter, 'delete', path);
            assert.ok(handler, `Missing handler for DELETE ${path}`);
            const { req, res } = mockGetRequest({ headers: { "x-session": sharedSession }, params: {} });
            // @ts-expect-error req is fine as-is
            await handler(req, res, null);
            assert.equal(res.statusCode, 400);
            assert.equal(res.body.message, `${label} GUID is required`);
        });
    }
});

describe("GET /api/cybrid list routes session validation", () => {
    for (const path of getListRoutes) {
        test(`GET ${path} is 403 Session ID Required when the header is missing`, async () => {
            const handler = findRouteHandler(cybridRouter, 'get', path);
            assert.ok(handler, `Missing handler for GET ${path}`);
            const { req, res } = mockGetRequest({});
            // @ts-expect-error req is fine as-is
            await handler(req, res, null);
            assert.equal(res.statusCode, 403);
            assert.equal(res.body.message, 'Session ID Required');
        });
    }
});

describe("Platform-admin bank routes and customer enumeration are denied", () => {
    const deniedBankRoutes: Array<{ method: "post" | "get" | "patch"; path: string }> = [
        { method: "post", path: "/cybrid/bank" },
        { method: "get", path: "/cybrid/bank/:bank_guid" },
        { method: "get", path: "/cybrid/banks" },
        { method: "patch", path: "/cybrid/bank/:bank_guid" },
    ];
    for (const { method, path } of deniedBankRoutes) {
        test(`${method.toUpperCase()} ${path} is 403 Forbidden even with a valid session`, async () => {
            const handler = findRouteHandler(cybridRouter, method, path);
            assert.ok(handler, `Missing handler for ${method} ${path}`);
            const { req, res } = mockGetRequest({
                headers: { "x-session": sharedSession },
                body: { session: sharedSession, name: "x" },
                params: { bank_guid: randomUUID() },
            });
            // @ts-expect-error req is fine as-is
            await handler(req, res, null);
            assert.equal(res.statusCode, 403);
            assert.equal(res.body.message, "Forbidden");
        });
    }

    test("GET /cybrid/customers is 403 Forbidden even with a valid session", async () => {
        const handler = findRouteHandler(cybridRouter, "get", "/cybrid/customers");
        assert.ok(handler, "Missing handler for GET /cybrid/customers");
        const { req, res } = mockGetRequest({ headers: { "x-session": sharedSession } });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, "Forbidden");
    });
});

describe("POST /api/cybrid/fiat-transfer amount validation", () => {
    async function postFiatTransfer(overrides: Record<string, unknown>) {
        const handler = findRouteHandler(cybridRouter, 'post', "/cybrid/fiat-transfer");
        assert.ok(handler, "Missing handler for POST /cybrid/fiat-transfer");
        const { req, res } = mockGetRequest({
            headers: { "x-session": sharedSession },
            body: {
                source_account_guid: randomUUID(),
                destination_account_guid: randomUUID(),
                amount: 100,
                ...overrides,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        return res;
    }

    test("is 400 when the source account GUID is missing", async () => {
        const res = await postFiatTransfer({ source_account_guid: undefined });
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Source and destination account GUIDs are required');
    });
    test("is 400 when the destination account GUID is missing", async () => {
        const res = await postFiatTransfer({ destination_account_guid: undefined });
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Source and destination account GUIDs are required');
    });
    test("is 400 when the amount is zero", async () => {
        const res = await postFiatTransfer({ amount: 0 });
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Amount must be a positive number');
    });
    test("is 400 when the amount is negative", async () => {
        const res = await postFiatTransfer({ amount: -100 });
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Amount must be a positive number');
    });
    test("is 400 when the amount is not an integer number of cents", async () => {
        const res = await postFiatTransfer({ amount: 100.5 });
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Amount must be a safe integer (in cents)');
    });
    test("is 400 when the amount exceeds the $5,000 transfer cap", async () => {
        const res = await postFiatTransfer({ amount: 5_000_01 });
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Amount exceeds maximum transfer limit of $5,000');
    });
});

after( () => {
    console.log("Tests complete");
    setTimeout(() => {
        process.emit('beforeExit');
    }, 100);
});

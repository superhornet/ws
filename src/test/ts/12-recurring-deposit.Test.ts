import { after, suite, test } from "node:test";
import assert from "node:assert";
import { router as recurringDepositRouter } from "../../main/ts/controllers/RecurringDepositController.ts";
import { findRouteHandler, mockGetRequest } from "./mocks.ts";

/**
 * Validation-layer coverage for the recurring-deposit routes: every test below
 * rejects during plan() (requireBody / requireParam), before session resolution
 * or any database write, so no recurring-deposit rows are ever created.
 */
async function callHandler(method: string, body?: Record<string, unknown>) {
    const handler = findRouteHandler(recurringDepositRouter, method, '/recurring-deposit');
    assert.ok(handler, "Missing handler for recurring-deposit endpoint");
    const { req, res } = mockGetRequest(body === undefined ? {} : { body });
    // @ts-expect-error req is fine as-is
    await handler(req, res, null);
    return res;
}

suite("Recurring-deposit routes: input validation and missing session", () => {
    for (const method of ["post", "put", "delete"]) {
        test(`${method.toUpperCase()} is 400 when the body is empty`, async () => {
            const res = await callHandler(method);
            assert.equal(res.statusCode, 400);
            assert.equal(res.body.message, 'Empty JSON Body');
        });
    }

    test("POST is 400 when the body has no data", async () => {
        const res = await callHandler("post", { message: "Malformed body", session: "not-checked" });
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Substack identifier is required');
    });

    test("PUT is 400 when the body has no data", async () => {
        const res = await callHandler("put", { message: "Malformed body", session: "not-checked" });
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Recurring deposit identifier is required');
    });

    test("DELETE is 400 when the body has no data", async () => {
        const res = await callHandler("delete", { message: "Malformed body", session: "not-checked" });
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Recurring deposit identifier is required');
    });

    test("POST is 403 when the session is missing", async () => {
        const res = await callHandler("post", {
            data: { to_identifier: "00000000-0000-0000-0000-000000000000" },
            message: "Missing session",
        });
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session ID Required');
    });

    test("PUT is 403 when the session is missing", async () => {
        const res = await callHandler("put", {
            data: { recurring_deposit_identifier: "00000000-0000-0000-0000-000000000000" },
            message: "Missing session",
        });
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session ID Required');
    });

    test("DELETE is 403 when the session is missing", async () => {
        const res = await callHandler("delete", {
            data: { recurring_deposit_identifier: "00000000-0000-0000-0000-000000000000" },
            message: "Missing session",
        });
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session ID Required');
    });
});

after( () => {
    console.log("Tests complete");
    setTimeout(() => {
        process.emit('beforeExit', 0);
    }, 100);
});

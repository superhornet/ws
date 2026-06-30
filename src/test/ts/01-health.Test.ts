import { test, after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { router as healthRouter } from "../../main/ts/routes/index.ts"
import { findRouteHandler, mockHealth } from "../../main/ts/libs/mocks.ts";

describe("Testing the health routes", { skip: false }, async () => {
    describe("Make GET request to /health endpoint", async () => {
        it("Checks the handler-Arrange", { skip: false }, async () => {
            const handler = findRouteHandler(healthRouter, 'get', '/health');
            const { req, res } = mockHealth();
            test("Handler", async () => {
                assert.ok(handler, "Missing handler for GET /health");
            });
            it("Act", async () => {
                //@ts-expect-error req is fine as-is
                await handler(req, res, null);
            });
            it("Assert", { skip: false }, () => {
                test("statusCode is 200 OK", () => { assert.strictEqual(res.statusCode, 200); });
                test("message OK", () => { assert.strictEqual(res.body.message, 'OK'); });
                test("Empty body data", () => { assert.equal(res.body.data, null) });
            });
        });
    });
    after(async () => {
        setTimeout(() => {
            process.emit('beforeExit');
        }, 500);
    });
});


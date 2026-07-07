import { test, after, suite } from "node:test";
import assert from "node:assert/strict";
import { router as healthRouter } from "../../main/ts/routes/index.ts"
import { findRouteHandler, mockHealth } from "./mocks.ts";

suite("Health routes", () => {
    test("GET /health returns 200 OK with a null body", async () => {
        const handler = findRouteHandler(healthRouter, 'get', '/health');
        assert.ok(handler, "Missing handler for GET /health");
        const { req, res } = mockHealth();
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.body.message, 'OK');
        assert.equal(res.body.data, null);
    });
});

after(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    process.emit('beforeExit');
});

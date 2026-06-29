import { describe, it, suite, test, after } from "node:test";
import assert from "node:assert";
import { router as sessionRouter } from "../../main/ts/controllers/SessionController.ts";
import { findRouteHandler, mockSession } from "./mocks.ts";

suite("Testing the Session routes", () => {
    describe("Make GET request to /api/session endpoint", () => {
        it("Checks the handler-Arrange", async () => {
            const handler = findRouteHandler(sessionRouter, 'get', '/session');
            const { req, res } = mockSession();
            test("Handler is okay", () => {
                assert.ok(handler, "Missing handler for GET /api/session");
            });
            it("Act", async () => {
                // @ts-expect-error req is fine as-is
                await handler(req, res, () => null);
            });
            it("Assert", { skip: false }, () => {
                test("statusCode should be 200", () => {
                    assert.equal(res.statusCode, 200);
                });
                test("message should be OK", () => {
                    assert.equal(res.body.message, 'OK');
                });
                test("Returned uuid should be 36 characters long", () => {
                    assert.equal((res.body.data).uuid.length, 36);
                });
                test("OTP should be 6 characters long.", () => {
                    assert.equal((res.body.data).otp.length, 6);
                });
            });
        });
    });
    after(async () => {
        setTimeout(() => {
            process.emit('beforeExit');
        }, 100);
    });
});

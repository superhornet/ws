import { describe, it, suite, test, after } from "node:test";
import assert from "node:assert";
import { router as sessionRouter } from "../../main/ts/controllers/SessionController.ts";
import { Session } from "../../main/ts/models/Session.ts";
import { query } from "../../main/ts/libs/postgresDB.ts";
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
                test("code should be 200", () => {
                    assert.equal(res.body.code, 200);
                });
                test("uuid should be a valid UUID", () => {
                    assert.match((res.body.data).uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
                });
                test("OTP should be uppercase alphanumeric", () => {
                    assert.match((res.body.data).otp, /^[0-9A-Z]{6}$/);
                });
                test("expires should be a future timestamp", () => {
                    assert.ok(new Date((res.body.data).expires).getTime() > Date.now());
                });
            });
        });
    });
    describe("Make DELETE request to /api/session endpoint", () => {
        it("Checks the handler-Arrange", async () => {
            const handler = findRouteHandler(sessionRouter, 'delete', '/session');
            const { req, res } = mockSession();
            test("Handler is okay", () => {
                assert.ok(handler, "Missing handler for DELETE /api/session");
            });
            it("Act", async () => {
                // @ts-expect-error req is fine as-is
                await handler(req, res, () => null);
            });
            it("Assert", { skip: false }, () => {
                test("statusCode should be 204", () => {
                    assert.equal(res.statusCode, 204);
                });
                test("code should be 204", () => {
                    assert.equal(res.body.code, 204);
                });
                test("message should be No Content", () => {
                    assert.equal(res.body.message, 'No Content');
                });
                test("data should be null", () => {
                    assert.equal(res.body.data, null);
                });
            });
        });
    });
    describe("Session.kill() prunes expired sessions", () => {
        it("deletes sessions whose expiry is in the past", async () => {
            const inserted = await query<{ uuid: string }>(
                `INSERT INTO sessions (otp, expires) VALUES ($1, NOW() - INTERVAL '1 hour') RETURNING uuid;`,
                ["EXPIRE"]
            );
            const expiredUuid = inserted.at(0)?.uuid;
            assert.ok(expiredUuid, "Failed to seed an expired session");

            await Session.kill();

            const remaining = await query<{ uuid: string }>(
                `SELECT uuid FROM sessions WHERE uuid = $1;`,
                [expiredUuid]
            );
            assert.equal(remaining.length, 0);
        });
        it("leaves unexpired sessions intact", async () => {
            const created = await Session.create();

            await Session.kill();

            const remaining = await query<{ uuid: string }>(
                `SELECT uuid FROM sessions WHERE uuid = $1;`,
                [created.uuid]
            );
            assert.equal(remaining.length, 1);
        });
    });
    after(async () => {
        setTimeout(() => {
            process.emit('beforeExit');
        }, 100);
    });
});

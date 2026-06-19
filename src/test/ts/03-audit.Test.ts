import { suite, after, describe, it, test } from "node:test";
import assert from "node:assert";
import { router as auditRouter } from "../../main/ts/controllers/AuditController.ts";
import { router as sessionRouter } from "../../main/ts/controllers/SessionController.ts";

import { mockAudit, mockSession, findRouteHandler } from "../../main/ts/libs/mocks.ts";

suite("Testing the Audit routes without session", () => {
    describe("Make a POST request to /api/audit endpoint", () => {
        it("Checks the failing paths for empty body", async () => {
            const handler = findRouteHandler(auditRouter, 'post', '/audit');
            const { req, res } = mockAudit({});
            test("Handler is okay", () => {
                assert.ok(handler, "Missing handler for PUT /api/audit");
            })
            it("Act", async () => {
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
            });
            test("response is 400 Bad Response, if body has been omitted.", async () => {
                assert.equal(res.statusCode, 400);
                assert.equal(res.body.message, 'Empty JSON body');
            });
        });
        it("Checks the failing paths for missing session", async () => {
            const handler = findRouteHandler(auditRouter, 'post', '/audit');
            const { req, res } = mockAudit({ body: { message: "Missing session." } });
            test("Handler is okay", () => {
                assert.ok(handler, "Missing handler for PUT /api/audit");
            })
            it("Act", async () => {
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
            });
            test("response is 403 Unauthorized, if sessuin has been omitted.", async () => {
                assert.equal(res.statusCode, 403);
                assert.equal(res.body.message, 'Session ID Required');
            });
        });
    });
});
suite("Testing the audit routes with session", () => {
    describe("Get a session", async () => {
        const handler = findRouteHandler(sessionRouter, 'get', '/session');
        assert.ok(handler, "Missing handler for session post");

        const { req, res } = mockSession();
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        const sharedSession = res.body.data.uuid;
    describe("Make a POST request to /api/audit endpoint", () => {
        it("Checks the success path", async () => {
            const handler = findRouteHandler(auditRouter, 'post', '/audit');
            const { req, res } = mockAudit({ body: { message: "<Unit> Test&amp; Message", session: sharedSession } });
            test("Handler is okay", () => {
                assert.ok(handler, "Missing handler for PUT /api/audit");
            })
            it("Act", async () => {
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                //assert.equal(res.statusCode, 201);
            });
            test("Response is 201 Created if appropriate body data supplied", () => {
                assert.equal(res.statusCode, 201);
                assert.equal(res.body.message, 'Created');
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

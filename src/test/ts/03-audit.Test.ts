import { suite, after, describe, it, test } from "node:test";
import assert from "node:assert";
import { router as auditRouter } from "../../main/ts/controllers/AuditController.ts";
import { router as sessionRouter } from "../../main/ts/controllers/SessionController.ts";
import { Audit } from "../../main/ts/models/Audit.ts";

import { mockAudit, mockSession, findRouteHandler } from "./mocks.ts";

suite("Testing the Audit routes without session", () => {
    describe("Make a POST request to /api/audit endpoint", () => {
        it("Checks the failing paths for empty body", async () => {
            const handler = findRouteHandler(auditRouter, 'post', '/audit');
            const { req, res } = mockAudit({});
            test("Handler is okay", () => {
                assert.ok(handler, "Missing handler for POST /api/audit");
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
                assert.ok(handler, "Missing handler for POST /api/audit");
            })
            it("Act", async () => {
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
            });
            test("response is 403 Unauthorized, if session has been omitted.", async () => {
                assert.equal(res.statusCode, 403);
                assert.equal(res.body.message, 'Session ID Required');
            });
        });
        it("Checks the failing path for a forged session", async () => {
            const handler = findRouteHandler(auditRouter, 'post', '/audit');
            const { req, res } = mockAudit({ body: { message: "Forged session.", session: "00000000-0000-0000-0000-000000000000" } });
            test("Handler is okay", () => {
                assert.ok(handler, "Missing handler for POST /api/audit");
            })
            it("Act", async () => {
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
            });
            test("response is 403 Unauthorized, if the session is not valid.", async () => {
                assert.equal(res.statusCode, 403);
                assert.equal(res.body.message, 'Unauthorized');
            });
        });
    });
});
suite("Testing the audit routes with session", () => {
    describe("Get a session", async () => {
        const handler = findRouteHandler(sessionRouter, 'get', '/session');
        assert.ok(handler, "Missing handler for session get");

        const { req, res } = mockSession();
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        const sharedSession = res.body.data.uuid;
    describe("Make a POST request to /api/audit endpoint", () => {
        it("Checks the success path", async () => {
            const handler = findRouteHandler(auditRouter, 'post', '/audit');
            const { req, res } = mockAudit({ body: { message: "<Unit> Test&amp; Message", session: sharedSession } });
            test("Handler is okay", () => {
                assert.ok(handler, "Missing handler for POST /api/audit");
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

    describe("Auditing is guaranteed even for out-of-range messages", async () => {
        const sessionHandler = findRouteHandler(sessionRouter, 'get', '/session');
        assert.ok(sessionHandler, "Missing handler for session get");

        const { req, res } = mockSession();
        // @ts-expect-error req is fine as-is
        await sessionHandler(req, res, null);
        const guaranteeSession = res.body.data.uuid;

        it("Writes a row with a placeholder when the message is too short", async () => {
            const entry = await Audit.logMessage("a", guaranteeSession);
            assert.ok(entry, "Expected an audit row to be written for a too-short message");
            assert.equal(entry?.message, "(no message)");
        });

        it("Writes a row with a clamped message when the message is too long", async () => {
            const longMessage = "x".repeat(600);
            const entry = await Audit.logMessage(longMessage, guaranteeSession);
            assert.ok(entry, "Expected an audit row to be written for a too-long message");
            assert.equal(entry?.message.length, 512);
        });

        it("Strips HTML from the stored message", async () => {
            const entry = await Audit.logMessage("<b>hi there</b>", guaranteeSession);
            assert.ok(entry, "Expected an audit row to be written for an HTML message");
            assert.ok(!entry.message.includes("<"), "Raw '<' should not survive sanitization");
            assert.ok(!entry.message.includes(">"), "Raw '>' should not survive sanitization");
            assert.ok(entry.message.includes("hi there"), "Message text should be preserved");
        });
    });

    describe("Derives the audit message when none is supplied", async () => {
        const sessionHandler = findRouteHandler(sessionRouter, 'get', '/session');
        assert.ok(sessionHandler, "Missing handler for session get");

        const { req, res } = mockSession();
        // @ts-expect-error req is fine as-is
        await sessionHandler(req, res, null);
        const derivedSession = res.body.data.uuid;

        it("Joins action, entity and identifier when message is absent", async () => {
            const handler = findRouteHandler(auditRouter, 'post', '/audit');
            const { req, res } = mockAudit({ body: { session: derivedSession, action: "create", entity: "user", entity_identifier: "123" } });
            // @ts-expect-error req is fine as-is
            await handler(req, res, null);
            assert.equal(res.statusCode, 201);
            assert.equal((res.body.data as { message: string }).message, "create:user:123");
        });

        it("Falls back to a default label when nothing identifies the event", async () => {
            const handler = findRouteHandler(auditRouter, 'post', '/audit');
            const { req, res } = mockAudit({ body: { session: derivedSession } });
            // @ts-expect-error req is fine as-is
            await handler(req, res, null);
            assert.equal(res.statusCode, 201);
            assert.equal((res.body.data as { message: string }).message, "Audit event");
        });
    });

    after(async () => {
        setTimeout(() => {
            process.emit('beforeExit');
        }, 100);
    });
});

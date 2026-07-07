import { suite, after, test } from "node:test";
import assert from "node:assert";
import { router as auditRouter } from "../../main/ts/controllers/AuditController.ts";
import { router as sessionRouter } from "../../main/ts/controllers/SessionController.ts";
import { Audit } from "../../main/ts/models/Audit.ts";

import { mockAudit, mockSession, findRouteHandler } from "./mocks.ts";

async function createSession(): Promise<string> {
    const handler = findRouteHandler(sessionRouter, 'get', '/session');
    assert.ok(handler, "Missing handler for session get");
    const { req, res } = mockSession();
    // @ts-expect-error req is fine as-is
    await handler(req, res, null);
    return res.body.data.uuid;
}

async function postAudit(body: { session?: string; message?: string; action?: string; entity?: string; entity_identifier?: string }) {
    const handler = findRouteHandler(auditRouter, 'post', '/audit');
    assert.ok(handler, "Missing handler for POST /api/audit");
    const { req, res } = mockAudit({ body });
    // @ts-expect-error req is fine as-is
    await handler(req, res, null);
    return res;
}

suite("Audit routes: input validation and session guards", () => {
    test("POST is 400 when the body is empty", async () => {
        const handler = findRouteHandler(auditRouter, 'post', '/audit');
        assert.ok(handler, "Missing handler for POST /api/audit");
        const { req, res } = mockAudit({});
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Empty JSON body');
    });

    test("POST is 403 when the session is missing", async () => {
        const res = await postAudit({ message: "Missing session." });
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session ID Required');
    });

    test("POST is 403 when the session is forged", async () => {
        const res = await postAudit({ message: "Forged session.", session: "00000000-0000-0000-0000-000000000000" });
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Unauthorized');
    });
});

suite("Audit routes: success path", () => {
    test("POST is 201 Created for a valid session and message", async () => {
        const session = await createSession();
        const res = await postAudit({ message: "<Unit> Test&amp; Message", session });
        assert.equal(res.statusCode, 201);
        assert.equal(res.body.message, 'Created');
    });

    test("POST returns the HTML-sanitized message it stored", async () => {
        const session = await createSession();
        const res = await postAudit({ message: "<Unit> Test&amp; Message", session });
        assert.equal(res.statusCode, 201);
        assert.equal(
            (res.body.data as { message: string }).message,
            "{less_than}Unit{greater_than} Test{ampersand}amp{semicolon} Message",
        );
    });

    test("POST prefers an explicit message over action/entity fields", async () => {
        const session = await createSession();
        const res = await postAudit({ session, message: "explicit wins", action: "create", entity: "user", entity_identifier: "123" });
        assert.equal(res.statusCode, 201);
        assert.equal((res.body.data as { message: string }).message, "explicit wins");
    });
});

suite("Auditing is guaranteed even for out-of-range messages", () => {
    test("Writes a row with a placeholder when the message is too short", async () => {
        const session = await createSession();
        const entry = await Audit.logMessage("a", session);
        assert.ok(entry, "Expected an audit row to be written for a too-short message");
        assert.equal(entry?.message, "(no message)");
    });

    test("Writes a row with a clamped message when the message is too long", async () => {
        const session = await createSession();
        const longMessage = "x".repeat(600);
        const entry = await Audit.logMessage(longMessage, session);
        assert.ok(entry, "Expected an audit row to be written for a too-long message");
        assert.equal(entry?.message.length, 512);
    });

    test("Strips HTML from the stored message", async () => {
        const session = await createSession();
        const entry = await Audit.logMessage("<b>hi there</b>", session);
        assert.ok(entry, "Expected an audit row to be written for an HTML message");
        assert.ok(!entry.message.includes("<"), "Raw '<' should not survive sanitization");
        assert.ok(!entry.message.includes(">"), "Raw '>' should not survive sanitization");
        assert.ok(entry.message.includes("hi there"), "Message text should be preserved");
    });

    test("Keeps a message at exactly the minimum length", async () => {
        const session = await createSession();
        const entry = await Audit.logMessage("ab", session);
        assert.equal(entry?.message, "ab");
    });

    test("Substitutes the placeholder for a whitespace-only message", async () => {
        const session = await createSession();
        const entry = await Audit.logMessage("   ", session);
        assert.equal(entry?.message, "(no message)");
    });

    test("Trims leading and trailing whitespace before storing", async () => {
        const session = await createSession();
        const entry = await Audit.logMessage("  hi there  ", session);
        assert.equal(entry?.message, "hi there");
    });
});

suite("Derives the audit message when none is supplied", () => {
    test("Joins action, entity and identifier when message is absent", async () => {
        const session = await createSession();
        const res = await postAudit({ session, action: "create", entity: "user", entity_identifier: "123" });
        assert.equal(res.statusCode, 201);
        assert.equal((res.body.data as { message: string }).message, "create:user:123");
    });

    test("Falls back to a default label when nothing identifies the event", async () => {
        const session = await createSession();
        const res = await postAudit({ session });
        assert.equal(res.statusCode, 201);
        assert.equal((res.body.data as { message: string }).message, "Audit event");
    });

    test("Uses a single field alone when it is the only one supplied", async () => {
        const session = await createSession();
        const res = await postAudit({ session, action: "create" });
        assert.equal(res.statusCode, 201);
        assert.equal((res.body.data as { message: string }).message, "create");
    });

    test("Joins only the present fields when the identifier is absent", async () => {
        const session = await createSession();
        const res = await postAudit({ session, action: "create", entity: "user" });
        assert.equal(res.statusCode, 201);
        assert.equal((res.body.data as { message: string }).message, "create:user");
    });
});

after(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    process.emit('beforeExit');
});

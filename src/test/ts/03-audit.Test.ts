import { after, describe, test } from "node:test";
import assert from "node:assert";
import { router as auditRouter } from "../../main/ts/controllers/AuditController.ts";
import { router as sessionRouter } from "../../main/ts/controllers/SessionController.ts";

import { mockAudit, mockSession, findRouteHandler } from "../../main/ts/libs/mocks.ts";

let sharedSession: string = "";
describe("Get a session", async () => {
    const handler = findRouteHandler(sessionRouter, 'get', '/session');
    assert.ok(handler, "Missing handler for session post");

    const {req, res} = mockSession();
    await handler(req, res, null);

    sharedSession = (res.body.data).uuid;
})
describe("Testing the /api/audit endpoint", () => {
    const handler = findRouteHandler(auditRouter, 'post', '/audit');
    assert.ok(handler, "Missing handler for audit post");

    test("response is 400 Bad Response, if body has been omitted.", async () => {
        const { req, res } = mockAudit({});

        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Empty JSON body');
    });

    test("Response is 201 Created if appropriate body data supplied", async () => {
        const { req, res } = mockAudit({body: {message: "<Unit> Test&amp; Message", session: sharedSession}});

        await handler(req, res, null);
        assert.equal(res.statusCode, 201);
        assert.equal((res.body.data).message, 'Created');

    })
});
after( () => {
    console.log("Tests complete");
    process.emit('beforeExit');
});

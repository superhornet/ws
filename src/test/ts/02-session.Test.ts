import { describe, test, after } from "node:test";
import assert from "node:assert";
import { router as sessionRouter } from "../../main/ts/controllers/SessionController.ts";

function findRouteHandler(router: typeof sessionRouter, method: string, path: string) {
    const layer = router.stack.find(
        (layer) =>
            layer.route?.path === path &&
            layer.route.methods[method.toLowerCase()]
    );
    return layer?.route?.stack[0]?.handle;
}
function mockSession() {
    const req = {};
    const res = {
        statusCode: -1,
        body: {
            code: -1,
            data: {
                uuid: "cf76290e-4e0f-461d-8c0e-9fa073610f6f",
                expires: "",
                otp: ""
            },
            message: ""
        },
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: typeof this.body) {
            this.body = payload;
            return this;
        }
    };
    return { req, res };
}

describe("Testing the /api/session endpoint", () => {
    test("response is 200 OK and contains data.", async () => {
        const handler = findRouteHandler(sessionRouter, 'get', '/session');
        assert.ok(handler, "Missing handler for session endpoint");
        const { req, res } = mockSession();

        await handler(req as any, res as any, (() => {}) as any);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.message, 'OK');
        assert.equal((res.body.data).uuid.length, 36);
        assert.equal((res.body.data).otp.length, 6);
    });
});
after( () => {
    console.log("Tests complete");
    process.emit('beforeExit');
});

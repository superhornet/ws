import { describe, test } from "node:test";
import assert from "node:assert";
import { router as healthRouter } from "../../main/ts/routes/index.ts";

function findRouteHandler(router: typeof healthRouter, method: string, path: string) {
    const layer = router.stack.find(
        (layer) =>
            layer.route?.path === path &&
            layer.route.methods[method.toLowerCase()]
    );
    return layer?.route?.stack[0]?.handle;
}
function mockHealth() {
    const req = { Request };
    const res = {
        statusCode: -1,
        body: {
            code: -1,
            data: null,
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

describe("Testing the /health endpoint", () => {
    test("response is 200 OK", async () => {
        const handler = findRouteHandler(healthRouter, 'get', '/health');
        assert.ok(handler, "Application unhealthy");
        const { req, res } = mockHealth();

        await handler(req, res, null);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.message, 'OK');
    });
});

import { after, describe, test, mock, beforeEach } from "node:test";
import assert from "node:assert";
import type { IdempotencyRecord, CachedResponse } from "../../main/ts/types/IdempotencyTypes.ts";

/**
 * State-machine tests for `withIdempotency`. The real `IdempotencyKey` model
 * hits Postgres; mocking only that module lets us drive `acquire` to each stored
 * state and assert how the wrapper responds — without a live DB. The critical
 * case is the callback-throws path: the lock must be marked failed (terminal),
 * NEVER deleted, so a retry with the same key cannot re-run an external
 * side-effect that may already have executed (the double-spend window).
 */
let acquireResult: IdempotencyRecord | null = null;
let completeCalls: unknown[][] = [];
let markFailedCalls: unknown[][] = [];

mock.module("../../main/ts/models/IdempotencyKey.ts", {
    namedExports: {
        IdempotencyKey: class {
            static async acquire(): Promise<IdempotencyRecord | null> {
                return acquireResult;
            }
            static async complete(...args: unknown[]): Promise<void> {
                completeCalls.push(args);
            }
            static async markFailed(...args: unknown[]): Promise<void> {
                markFailedCalls.push(args);
            }
        },
    },
});

// Imported after the mock is installed so the wrapper binds to the mocked model
// (a static import would hoist above `mock.module`).
const { withIdempotency } = await import("../../main/ts/libs/withIdempotency.ts");

const SESSION = "11111111-1111-1111-1111-111111111111";
const ROUTE = "/cybrid/fiat-transfer";
const KEY = "idem-key-abc";

function makeReq(idempotencyKey?: string) {
    return { headers: idempotencyKey ? { "idempotency-key": idempotencyKey } : {} };
}

function makeRes() {
    return {
        statusCode: -1,
        body: null as unknown,
        headers: {} as Record<string, string>,
        status(code: number) { this.statusCode = code; return this; },
        json(payload: unknown) { this.body = payload; return this; },
        setHeader(name: string, value: string) { this.headers[name] = value; },
    };
}

const okCallback = async (): Promise<CachedResponse> =>
    ({ code: 201, data: { transfer: "t-1" }, message: "Fiat transfer created" });

beforeEach(() => {
    acquireResult = null;
    completeCalls = [];
    markFailedCalls = [];
});

describe("withIdempotency state machine", () => {
    test("missing Idempotency-Key header is rejected with 428", async () => {
        const req = makeReq();
        const res = makeRes();
        let callbackRan = false;
        await assert.rejects(
            // @ts-expect-error minimal req/res mocks
            () => withIdempotency(req, res, SESSION, ROUTE, async () => { callbackRan = true; return okCallback(); }),
            (error: { statusCode?: number }) => error.statusCode === 428,
        );
        assert.equal(callbackRan, false, "callback must not run without a key");
    });

    test("new key runs the callback, completes, and responds with the result", async () => {
        acquireResult = null; // acquire created a fresh in_progress lock
        const req = makeReq(KEY);
        const res = makeRes();
        // @ts-expect-error minimal req/res mocks
        await withIdempotency(req, res, SESSION, ROUTE, okCallback);
        assert.equal(res.statusCode, 201);
        assert.deepEqual(res.body, { code: 201, data: { transfer: "t-1" }, message: "Fiat transfer created" });
        assert.equal(completeCalls.length, 1, "should cache the successful response");
        assert.equal(markFailedCalls.length, 0);
    });

    test("completed duplicate replays the cached response without re-running the callback", async () => {
        acquireResult = {
            id: 1, idempotency_key: KEY, session_id: SESSION, route_path: ROUTE,
            status: "completed", response_code: 201,
            response_body: { code: 201, data: { transfer: "t-1" }, message: "Fiat transfer created" },
            created_at: "", completed_at: "",
        };
        const req = makeReq(KEY);
        const res = makeRes();
        let callbackRan = false;
        // @ts-expect-error minimal req/res mocks
        await withIdempotency(req, res, SESSION, ROUTE, async () => { callbackRan = true; return okCallback(); });
        assert.equal(callbackRan, false, "must not re-run a completed operation");
        assert.equal(res.statusCode, 201);
        assert.equal(res.headers["Idempotent-Replayed"], "true");
        assert.equal(completeCalls.length, 0);
    });

    test("in-progress duplicate returns 409 with Retry-After and does not run the callback", async () => {
        acquireResult = {
            id: 1, idempotency_key: KEY, session_id: SESSION, route_path: ROUTE,
            status: "in_progress", response_code: null, response_body: null,
            created_at: "", completed_at: null,
        };
        const req = makeReq(KEY);
        const res = makeRes();
        let callbackRan = false;
        await assert.rejects(
            // @ts-expect-error minimal req/res mocks
            () => withIdempotency(req, res, SESSION, ROUTE, async () => { callbackRan = true; return okCallback(); }),
            (error: { statusCode?: number }) => error.statusCode === 409,
        );
        assert.equal(callbackRan, false);
        assert.ok(res.headers["Retry-After"], "should advertise Retry-After");
    });

    test("failed duplicate is refused with 409 and never re-runs the callback (no double-spend)", async () => {
        acquireResult = {
            id: 1, idempotency_key: KEY, session_id: SESSION, route_path: ROUTE,
            status: "failed", response_code: null, response_body: null,
            created_at: "", completed_at: "",
        };
        const req = makeReq(KEY);
        const res = makeRes();
        let callbackRan = false;
        await assert.rejects(
            // @ts-expect-error minimal req/res mocks
            () => withIdempotency(req, res, SESSION, ROUTE, async () => { callbackRan = true; return okCallback(); }),
            (error: { statusCode?: number }) => error.statusCode === 409,
        );
        assert.equal(callbackRan, false, "a failed key must never re-execute the operation");
    });

    test("callback error marks the key failed (never deletes it) and rethrows", async () => {
        acquireResult = null; // fresh lock acquired
        const req = makeReq(KEY);
        const res = makeRes();
        const boom = new Error("Cybrid response timed out after the transfer executed");
        await assert.rejects(
            // @ts-expect-error minimal req/res mocks
            () => withIdempotency(req, res, SESSION, ROUTE, async () => { throw boom; }),
            (error: Error) => error === boom,
        );
        assert.equal(markFailedCalls.length, 1, "the lock must transition to failed, not be released");
        assert.equal(completeCalls.length, 0);
    });
});

after(() => {
    console.log("Tests complete");
    setTimeout(() => {
        process.emit('beforeExit', 0);
    }, 100);
});

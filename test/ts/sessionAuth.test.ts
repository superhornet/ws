import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

type QueryFn = (text: string, params?: unknown[]) => Promise<unknown[]>;
const mockQuery = mock.fn<QueryFn>(async () => []);

mock.module("../../src/main/ts/libs/postgresDB.ts", {
    namedExports: {
        query: (text: string, params?: unknown[]) => mockQuery(text, params),
    },
});

const express = (await import("express")).default;
const { sessionAuth } = await import("../../src/main/ts/libs/sessionAuth.ts");

function createApp() {
    const app = express();
    app.use(express.json());
    app.use("/api", sessionAuth);
    app.get("/api/protected", (_req, res) => {
        res.status(200).json({ ok: true });
    });
    app.post("/api/protected", (_req, res) => {
        res.status(200).json({ ok: true });
    });
    return app;
}

interface JSONResult { status: number; body: Record<string, unknown> }

async function send(
    app: ReturnType<typeof express>,
    method: "GET" | "POST",
    path: string,
    options: { headers?: Record<string, string>; body?: unknown } = {},
): Promise<JSONResult> {
    const { request } = await import("node:http");
    const payload = options.body !== undefined ? JSON.stringify(options.body) : undefined;
    return new Promise<JSONResult>((resolve, reject) => {
        const server = app.listen(0, () => {
            const addr = server.address();
            if (!addr || typeof addr === "string") {
                server.close();
                return reject(new Error("Could not get server address"));
            }
            const req = request(
                {
                    hostname: "127.0.0.1",
                    port: addr.port,
                    path,
                    method,
                    headers: {
                        "Content-Type": "application/json",
                        ...options.headers,
                    },
                },
                (res) => {
                    let data = "";
                    res.on("data", (chunk: string) => { data += chunk; });
                    res.on("end", () => {
                        server.close();
                        resolve({
                            status: res.statusCode ?? 0,
                            body: data ? (JSON.parse(data) as Record<string, unknown>) : {},
                        });
                    });
                },
            );
            req.on("error", (error: Error) => {
                server.close();
                reject(error);
            });
            if (payload) req.write(payload);
            req.end();
        });
    });
}

describe("sessionAuth middleware", () => {
    beforeEach(() => {
        mockQuery.mock.resetCalls();
        mockQuery.mock.mockImplementation(async () => []);
    });

    it("passes the request through when a matching, unexpired session exists", async () => {
        mockQuery.mock.mockImplementation(async () => [{ id: 1 }]);
        const res = await send(createApp(), "GET", "/api/protected", {
            headers: { "X-Session": "11111111-1111-1111-1111-111111111111" },
        });
        assert.equal(res.status, 200);
        assert.equal(res.body.ok, true);
    });

    it("rejects a forged session UUID with 403 when no row matches", async () => {
        mockQuery.mock.mockImplementation(async () => []);
        const res = await send(createApp(), "GET", "/api/protected", {
            headers: { "X-Session": "deadbeef-dead-dead-dead-deadbeefdead" },
        });
        assert.equal(res.status, 403);
    });

    it("rejects an expired session with 403 (the SQL filters on expires > NOW())", async () => {
        // An expired session returns no rows from the expires-filtered query.
        mockQuery.mock.mockImplementation(async () => []);
        const res = await send(createApp(), "GET", "/api/protected", {
            headers: { "X-Session": "22222222-2222-2222-2222-222222222222" },
        });
        assert.equal(res.status, 403);
        const call = mockQuery.mock.calls[0]!;
        assert.match(call.arguments[0] as string, /expires > NOW\(\)/);
    });

    it("returns 403 and does not query when no session is present", async () => {
        const res = await send(createApp(), "GET", "/api/protected");
        assert.equal(res.status, 403);
        assert.equal(mockQuery.mock.callCount(), 0);
    });

    it("falls back to req.body.session for legacy mutation routes", async () => {
        mockQuery.mock.mockImplementation(async () => [{ id: 1 }]);
        const res = await send(createApp(), "POST", "/api/protected", {
            body: { session: "33333333-3333-3333-3333-333333333333" },
        });
        assert.equal(res.status, 200);
        const call = mockQuery.mock.calls[0]!;
        assert.equal((call.arguments[1] as unknown[])[0], "33333333-3333-3333-3333-333333333333");
    });

    it("prefers the X-Session header over a body session", async () => {
        mockQuery.mock.mockImplementation(async () => [{ id: 1 }]);
        await send(createApp(), "POST", "/api/protected", {
            headers: { "X-Session": "header-token-aaaaaaaaaaaaaaaaaaaaaaaa" },
            body: { session: "body-token-bbbbbbbbbbbbbbbbbbbbbbbbbb" },
        });
        const call = mockQuery.mock.calls[0]!;
        assert.equal((call.arguments[1] as unknown[])[0], "header-token-aaaaaaaaaaaaaaaaaaaaaaaa");
    });

    it("returns a generic 500 without leaking the raw error when the query throws", async () => {
        mockQuery.mock.mockImplementation(async () => {
            throw new Error('relation "sessions" does not exist: SELECT id FROM ...');
        });
        const res = await send(createApp(), "GET", "/api/protected", {
            headers: { "X-Session": "44444444-4444-4444-4444-444444444444" },
        });
        assert.equal(res.status, 500);
        assert.doesNotMatch(res.body.message as string, /sessions|SELECT|relation/);
    });
});

import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

mock.module("../../src/main/ts/libs/postgresDB.ts", {
    namedExports: {
        query: async () => [],
        withTransaction: async (fn: (client: unknown) => Promise<unknown>) =>
            fn({ query: async () => ({ rows: [{ id: 1 }] }) }),
    },
});

type AnyFn = (...args: unknown[]) => Promise<unknown>;
const fn = () => mock.fn<AnyFn>();

const mockSessionConstructor = mock.fn<() => void>(() => { /* noop */ });
const mockKill = fn();

class MockSession {
    public uuid = "11111111-1111-1111-1111-111111111111";
    public otp = "ABC123";
    public expires = "2030-01-01T00:00:00.000Z";
    public dbID = 7;

    constructor() {
        mockSessionConstructor();
    }

    static async create(): Promise<MockSession> {
        return new MockSession();
    }

    public session() {
        return {
            uuid: this.uuid,
            expires: this.expires,
            dbID: this.dbID,
            otp: this.otp,
        };
    }

    public toString() {
        return `{ uuid: '${this.uuid}', expires: '${this.expires}', dbID: ${this.dbID}}`;
    }

    static async kill(...args: unknown[]): Promise<unknown> {
        return mockKill(...args);
    }
}

mock.module("../../src/main/ts/models/Session.ts", {
    namedExports: { Session: MockSession },
});

const express = (await import("express")).default;
const { router } = await import("../../src/main/ts/controllers/SessionController.ts");

function createApp() {
    const app = express();
    app.use(express.json());
    app.use("/api", router);
    return app;
}

interface JSONResult { status: number; body: Record<string, unknown> }

async function sendJSON(
    app: ReturnType<typeof express>,
    method: "POST" | "GET" | "PUT" | "DELETE",
    path: string,
): Promise<JSONResult> {
    const { request } = await import("node:http");
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
                    headers: { "Content-Type": "application/json" },
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
            req.end();
        });
    });
}

function resetAllMocks() {
    mockSessionConstructor.mock.resetCalls();
    mockSessionConstructor.mock.mockImplementation(() => { /* noop */ });
    mockKill.mock.resetCalls();
    mockKill.mock.mockImplementation(async () => undefined);
}

describe("GET /api/session", () => {
    beforeEach(() => { resetAllMocks(); });

    it("constructs a new Session", async () => {
        await sendJSON(createApp(), "GET", "/api/session");
        assert.equal(mockSessionConstructor.mock.callCount(), 1);
    });

    it("returns 200 with the session payload", async () => {
        const res = await sendJSON(createApp(), "GET", "/api/session");
        assert.equal(res.status, 200);
        assert.equal(res.body.code, 200);
    });

    // Documents the current response shape. The payload includes dbID and otp,
    // both of which arguably should not be returned to clients. If this test
    // breaks because those fields were removed, update it deliberately.
    it("includes uuid, expires, dbID, and otp in the response", async () => {
        const res = await sendJSON(createApp(), "GET", "/api/session");
        const data = res.body.data as Record<string, unknown>;
        assert.equal(data.uuid, "11111111-1111-1111-1111-111111111111");
        assert.equal(data.expires, "2030-01-01T00:00:00.000Z");
        assert.equal(data.dbID, 7);
        assert.equal(data.otp, "ABC123");
    });

    it("returns 500 when the Session constructor throws", async () => {
        mockSessionConstructor.mock.mockImplementation(() => {
            throw new Error("boom");
        });
        const res = await sendJSON(createApp(), "GET", "/api/session");
        assert.equal(res.status, 500);
        assert.match(res.body.message as string, /boom/);
    });
});

describe("DELETE /api/session", () => {
    beforeEach(() => { resetAllMocks(); });

    it("calls Session.kill", async () => {
        await sendJSON(createApp(), "DELETE", "/api/session");
        assert.equal(mockKill.mock.callCount(), 1);
    });

    // Session.kill currently accepts no arguments and prunes all expired rows
    // globally — it does not invalidate the caller's own session. This test
    // pins that behavior so any change to a per-caller logout is intentional.
    it("invokes Session.kill with no arguments", async () => {
        await sendJSON(createApp(), "DELETE", "/api/session");
        const call = mockKill.mock.calls[0]!;
        assert.equal(call.arguments.length, 0);
    });

    it("returns 204 on success", async () => {
        const res = await sendJSON(createApp(), "DELETE", "/api/session");
        assert.equal(res.status, 204);
    });
});

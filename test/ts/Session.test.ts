import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { HTMLStatusError } from "../../src/main/ts/libs/HTMLStatusError.ts";

type QueryFn = (text: string, params?: unknown[]) => Promise<unknown[]>;
type ClientQueryFn = (
    text: string,
    params?: unknown[],
) => Promise<{ rows: Array<{ id: number; expires: string }> }>;
type TransactionFn = (
    fn: (client: { query: ClientQueryFn }) => Promise<unknown>,
) => Promise<unknown>;

const mockQuery = mock.fn<QueryFn>();
const mockWithTransaction = mock.fn<TransactionFn>();
const mockClientQuery = mock.fn<ClientQueryFn>();

mock.module("../../src/main/ts/libs/postgresDB.ts", {
    namedExports: {
        query: mockQuery,
        withTransaction: mockWithTransaction,
    },
});

const { Session } = await import("../../src/main/ts/models/Session.ts");

function resetAll() {
    mockQuery.mock.resetCalls();
    mockQuery.mock.mockImplementation(async () => []);
    mockClientQuery.mock.resetCalls();
    mockClientQuery.mock.mockImplementation(async () => ({
        rows: [{ id: 7, expires: "2030-01-01T00:00:00.000Z" }],
    }));
    mockWithTransaction.mock.resetCalls();
    mockWithTransaction.mock.mockImplementation(async (fn) =>
        fn({ query: mockClientQuery }),
    );
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const OTP_LEGAL_CHARS = "0123456789ABCDEFGHIJKLMNPQRSTUVWXYZ";

describe("Session.create", () => {
    beforeEach(() => { resetAll(); });

    it("generates a 36-character UUID", async () => {
        const session = await Session.create();
        assert.equal(session.uuid.length, 36);
        assert.match(session.uuid, UUID_REGEX);
    });

    it("generates a 6-character OTP", async () => {
        const session = await Session.create();
        assert.equal(session.otp.length, 6);
    });

    it("draws OTP characters only from the legal set (digits + A-Z minus O)", async () => {
        for (let attempt = 0; attempt < 50; attempt++) {
            const session = await Session.create();
            for (const character of session.otp) {
                assert.ok(
                    OTP_LEGAL_CHARS.includes(character),
                    `OTP character "${character}" is not in the legal set`,
                );
            }
        }
    });

    it("never produces the letter O in the OTP across many samples", async () => {
        for (let attempt = 0; attempt < 200; attempt++) {
            const session = await Session.create();
            assert.ok(!session.otp.includes("O"), `OTP contained letter O: ${session.otp}`);
        }
    });

    it("produces different UUIDs on each construction", async () => {
        const first = await Session.create();
        const second = await Session.create();
        assert.notEqual(first.uuid, second.uuid);
    });

    it("inserts a row with (uuid, otp) into sessions", async () => {
        const session = await Session.create();
        assert.equal(mockClientQuery.mock.callCount(), 1);
        const call = mockClientQuery.mock.calls[0]!;
        const sqlText = call.arguments[0] as string;
        const params = call.arguments[1] as unknown[];
        assert.match(sqlText, /INSERT INTO sessions/i);
        assert.match(sqlText, /uuid/i);
        assert.match(sqlText, /otp/i);
        assert.deepEqual(params, [session.uuid, session.otp]);
    });

    it("populates dbID and expires from the returned row", async () => {
        mockClientQuery.mock.mockImplementation(async () => ({
            rows: [{ id: 99, expires: "2031-06-01T00:00:00.000Z" }],
        }));
        const session = await Session.create();
        assert.equal(session.dbID, 99);
        assert.equal(session.expires, "2031-06-01T00:00:00.000Z");
    });

    it("rejects with HTMLStatusError(500) when the insert returns no rows", async () => {
        mockClientQuery.mock.mockImplementation(async () => ({ rows: [] }));
        await assert.rejects(
            Session.create(),
            (error: HTMLStatusError) => {
                assert.equal(error.statusCode, 500);
                assert.match(error.message, /Session creation failed/);
                return true;
            },
        );
    });
});

describe("Session.session()", () => {
    beforeEach(() => { resetAll(); });

    // Documents the current return shape. If this assertion changes, the public
    // API has changed too — confirm intent before updating.
    it("returns uuid, expires, dbID, and otp", async () => {
        const session = await Session.create();
        const payload = session.session();
        assert.equal(payload.uuid, session.uuid);
        assert.equal(payload.expires, session.expires);
        assert.equal(payload.dbID, session.dbID);
        assert.equal(payload.otp, session.otp);
    });
});

describe("Session.toString()", () => {
    beforeEach(() => { resetAll(); });

    it("includes uuid, expires, and dbID but not otp", async () => {
        const session = await Session.create();
        const text = session.toString();
        assert.ok(text.includes(session.uuid));
        assert.ok(text.includes(String(session.dbID)));
        assert.ok(!text.includes(session.otp));
    });
});

describe("Session.kill", () => {
    beforeEach(() => { resetAll(); });

    it("deletes only rows whose expires are in the past", async () => {
        await Session.kill();
        assert.equal(mockQuery.mock.callCount(), 1);
        const call = mockQuery.mock.calls[0]!;
        const sqlText = call.arguments[0] as string;
        const params = call.arguments[1] as unknown[];
        assert.match(sqlText, /DELETE FROM sessions/i);
        assert.match(sqlText, /expires\s*<\s*NOW\(\)/i);
        assert.deepEqual(params, []);
    });

    it("wraps query errors as HTMLStatusError(500)", async () => {
        mockQuery.mock.mockImplementation(async () => {
            throw new Error("connection refused");
        });
        await assert.rejects(
            Session.kill(),
            (error: HTMLStatusError) => {
                assert.equal(error.statusCode, 500);
                assert.match(error.message, /connection refused/);
                return true;
            },
        );
    });
});

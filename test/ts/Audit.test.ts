import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

// --- postgresDB mocks ---

type ClientQueryFn = (
    text: string,
    params?: unknown[],
) => Promise<{ rows: unknown[] }>;
type TransactionFn = (
    fn: (client: { query: ClientQueryFn }) => Promise<unknown>,
) => Promise<unknown>;

const mockWithTransaction = mock.fn<TransactionFn>();
const mockClientQuery = mock.fn<ClientQueryFn>();

mock.module("../../src/main/ts/libs/postgresDB.ts", {
    namedExports: {
        query: mock.fn(async () => []),
        withTransaction: mockWithTransaction,
    },
});

const { Audit } = await import("../../src/main/ts/models/Audit.ts");

function resetAll() {
    mockWithTransaction.mock.resetCalls();
    mockClientQuery.mock.resetCalls();
    mockClientQuery.mock.mockImplementation(async () => ({ rows: [] }));
    mockWithTransaction.mock.mockImplementation(async (fn) =>
        fn({ query: mockClientQuery }),
    );
}

const session = "11111111-1111-1111-1111-111111111111";

// --- sanitize ---

describe("Audit.sanitize", () => {
    it("strips C0 control characters including CR and LF", () => {
        const result = Audit.sanitize("hello\nworld\rfoo\x00bar");
        assert.equal(result, "hello world foo bar");
    });

    it("strips C1 control characters", () => {
        const result = Audit.sanitize("hello\x7Fworld\x9Ffoo");
        assert.equal(result, "hello world foo");
    });

    it("leaves printable ASCII and unicode unchanged", () => {
        const input = "Saved $100 USD → user 22222222 (✓)";
        assert.equal(Audit.sanitize(input), input);
    });

    it("truncates messages longer than 512 chars", () => {
        const input = "a".repeat(600);
        const result = Audit.sanitize(input);
        assert.equal(result.length, 512);
        assert.equal(result, "a".repeat(512));
    });

    it("preserves input at exactly 512 chars", () => {
        const input = "b".repeat(512);
        assert.equal(Audit.sanitize(input), input);
    });
});

// --- create ---

describe("Audit.create", () => {
    beforeEach(() => {
        resetAll();
    });

    it("returns an Audit instance with sanitized message and session", async () => {
        const audit = await Audit.create("hello", session);
        assert.equal(audit.message, "hello");
        assert.equal(audit.session, session);
    });

    it("sanitizes the message before persisting (log-injection guard)", async () => {
        await Audit.create("hello\nINJECTED", session);
        const [, params] = mockClientQuery.mock.calls[0]!.arguments as [
            string,
            unknown[],
        ];
        assert.deepEqual(params, ["hello INJECTED", session]);
    });

    it("issues INSERT INTO audit with message and session", async () => {
        await Audit.create("test message", session);
        assert.equal(mockWithTransaction.mock.callCount(), 1);
        assert.equal(mockClientQuery.mock.callCount(), 1);
        const [sql, params] = mockClientQuery.mock.calls[0]!.arguments as [
            string,
            unknown[],
        ];
        assert.match(sql, /INSERT INTO audit \(message, session\)/);
        assert.deepEqual(params, ["test message", session]);
    });

    it("awaits the transaction (insert failures propagate to caller)", async () => {
        mockWithTransaction.mock.mockImplementation(async () => {
            throw new Error("db down");
        });
        await assert.rejects(
            Audit.create("test", session),
            (error: Error) => error.message === "db down",
        );
    });
});

// --- instance methods ---

describe("Audit instance methods", () => {
    beforeEach(() => {
        resetAll();
    });

    it("audit() returns { id, message, session }", async () => {
        const audit = await Audit.create("hi", session);
        const result = audit.audit();
        assert.equal(result.message, "hi");
        assert.equal(result.session, session);
        assert.ok("id" in result);
    });

    it("toString() formats the entry as a single line", async () => {
        const audit = await Audit.create("hi", session);
        const str = audit.toString();
        assert.match(str, /message: 'hi'/);
        assert.match(str, new RegExp(`session: '${session}'`));
    });
});

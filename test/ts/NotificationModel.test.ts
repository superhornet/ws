import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { HTMLStatusError } from "../../src/main/ts/libs/HTMLStatusError.ts";

// --- postgresDB mocks ---

type QueryFn = (text: string, params?: unknown[]) => Promise<unknown[]>;
type ClientQueryFn = (
    text: string,
    params?: unknown[],
) => Promise<{ rows: Array<{ id: number }> }>;
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

const { Notification } = await import(
    "../../src/main/ts/models/Notification.ts"
);

// --- Helpers ---

function resetAll() {
    mockQuery.mock.resetCalls();
    mockQuery.mock.mockImplementation(async () => []);
    mockWithTransaction.mock.resetCalls();
    mockClientQuery.mock.resetCalls();
    mockClientQuery.mock.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
    mockWithTransaction.mock.mockImplementation(async (fn) =>
        fn({ query: mockClientQuery }),
    );
}

async function expectStatus(
    promise: Promise<unknown>,
    status: number,
    messageMatch: RegExp,
): Promise<void> {
    await assert.rejects(promise, (error: HTMLStatusError) => {
        assert.equal(error.statusCode, status);
        assert.match(error.message, messageMatch);
        return true;
    });
}

const validInput = {
    id: 0,
    session: "11111111-1111-1111-1111-111111111111",
    seen: false,
    message: "hello",
    identifier: "22222222-2222-2222-2222-222222222222",
};

// --- Constructor / storeNotification ---

describe("Notification.create", () => {
    beforeEach(() => {
        resetAll();
    });

    it("assigns message and identifier from input", async () => {
        const n = await Notification.create({ ...validInput } as never);
        assert.equal(n.message, "hello");
        assert.equal(n.identifier, validInput.identifier);
    });

    it("defaults identifier to empty string when omitted", async () => {
        const { identifier: _omit, ...withoutIdentifier } = validInput;
        void _omit;
        const n = await Notification.create(withoutIdentifier as never);
        assert.equal(n.identifier, "");
    });

    it("calls withTransaction to insert", async () => {
        await Notification.create({ ...validInput } as never);
        assert.equal(mockWithTransaction.mock.callCount(), 1);
    });

    it("sends INSERT INTO notifications with the mapped values", async () => {
        await Notification.create({ ...validInput } as never);
        assert.equal(mockClientQuery.mock.callCount(), 1);
        const [sql, params] = mockClientQuery.mock.calls[0]!.arguments as [
            string,
            unknown[],
        ];
        assert.match(sql, /INSERT INTO notifications/);
        assert.match(sql, /RETURNING id/);
        assert.deepEqual(params, ["hello", false, validInput.identifier]);
    });

    it("toJSON exposes the persisted row shape without underscore fields", async () => {
        mockClientQuery.mock.mockImplementation(async () => ({ rows: [{ id: 99 }] }));
        const n = await Notification.create({ ...validInput } as never);
        const json = JSON.parse(JSON.stringify(n));
        assert.deepEqual(json, {
            id: 99,
            seen: false,
            message: "hello",
            identifier: validInput.identifier,
        });
        assert.equal(Object.hasOwn(json, "_message"), false);
        assert.equal(Object.hasOwn(json, "_identifier"), false);
    });
});

// --- getAllForUser ---

describe("Notification.getAllForUser", () => {
    const row = {
        id: 7,
        seen: false,
        message: "hello",
        identifier: validInput.identifier,
    };

    beforeEach(() => {
        resetAll();
    });

    it("returns mapped rows when results exist", async () => {
        mockQuery.mock.mockImplementation(async () => [row]);
        const result = await Notification.getAllForUser(validInput.identifier);
        assert.equal(result.length, 1);
        assert.deepEqual(result[0], {
            id: 7,
            seen: false,
            message: "hello",
            identifier: validInput.identifier,
        });
    });

    it("returns an empty array when no rows exist", async () => {
        mockQuery.mock.mockImplementation(async () => []);
        const result = await Notification.getAllForUser(validInput.identifier);
        assert.deepEqual(result, []);
    });

    it("forwards the identifier to the SQL query", async () => {
        mockQuery.mock.mockImplementation(async () => []);
        await Notification.getAllForUser(validInput.identifier);
        const [sql, params] = mockQuery.mock.calls[0]!.arguments as [
            string,
            unknown[],
        ];
        assert.match(
            sql,
            /SELECT [\s\S]* FROM notifications\s+WHERE deleted = FALSE AND notification_identifier = \$1/,
        );
        assert.match(sql, /notification_identifier AS identifier/);
        assert.deepEqual(params, [validInput.identifier]);
    });

    it("re-throws HTMLStatusError unchanged", async () => {
        mockQuery.mock.mockImplementation(async () => {
            throw new HTMLStatusError("Forced 404", 404);
        });
        await expectStatus(
            Notification.getAllForUser(validInput.identifier),
            404,
            /Forced 404/,
        );
    });

    it("wraps non-HTMLStatusError as 500", async () => {
        mockQuery.mock.mockImplementation(async () => {
            throw new Error("db down");
        });
        await expectStatus(
            Notification.getAllForUser(validInput.identifier),
            500,
            /db down/,
        );
    });
});

// --- setAsSeen ---

describe("Notification.setAsSeen", () => {
    beforeEach(() => {
        resetAll();
    });

    it("issues an UPDATE against the matching id", async () => {
        mockQuery.mock.mockImplementation(async () => []);
        await Notification.setAsSeen(7);
        assert.equal(mockQuery.mock.callCount(), 1);
        const [sql, params] = mockQuery.mock.calls[0]!.arguments as [
            string,
            unknown[],
        ];
        assert.match(
            sql,
            /UPDATE notifications set seen=TRUE WHERE deleted = FALSE AND id = \$1/,
        );
        assert.deepEqual(params, [7]);
    });

    it("resolves to undefined on success", async () => {
        mockQuery.mock.mockImplementation(async () => []);
        const result = await Notification.setAsSeen(7);
        assert.equal(result, undefined);
    });

    it("wraps DB errors as 500", async () => {
        mockQuery.mock.mockImplementation(async () => {
            throw new Error("db down");
        });
        await expectStatus(Notification.setAsSeen(7), 500, /db down/);
    });
});

// --- setDeleted ---

describe("Notification.setDeleted", () => {
    beforeEach(() => {
        resetAll();
    });

    it("issues a soft-delete UPDATE against the matching id", async () => {
        mockQuery.mock.mockImplementation(async () => []);
        await Notification.setDeleted(7);
        assert.equal(mockQuery.mock.callCount(), 1);
        const [sql, params] = mockQuery.mock.calls[0]!.arguments as [
            string,
            unknown[],
        ];
        assert.match(
            sql,
            /UPDATE notifications set deleted=TRUE WHERE deleted = FALSE AND id = \$1/,
        );
        assert.deepEqual(params, [7]);
    });

    it("resolves to undefined on success", async () => {
        mockQuery.mock.mockImplementation(async () => []);
        const result = await Notification.setDeleted(7);
        assert.equal(result, undefined);
    });

    it("wraps DB errors as 500", async () => {
        mockQuery.mock.mockImplementation(async () => {
            throw new Error("db down");
        });
        await expectStatus(Notification.setDeleted(7), 500, /db down/);
    });
});

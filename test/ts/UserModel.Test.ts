import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { HTMLStatusError } from "../../src/main/ts/libs/HTMLStatusError.ts";

// --- postgresDB mocks ---

type QueryFn = (text: string, params?: unknown[]) => Promise<unknown[]>;
type ClientQueryFn = (text: string, params?: unknown[]) => Promise<{ rows: Array<{ id: number }> }>;
type TransactionFn = (fn: (client: { query: ClientQueryFn }) => Promise<unknown>) => Promise<unknown>;

const mockQuery = mock.fn<QueryFn>();
const mockWithTransaction = mock.fn<TransactionFn>();
const mockClientQuery = mock.fn<ClientQueryFn>();

mock.module("../../src/main/ts/libs/postgresDB.ts", {
    namedExports: {
        query: mockQuery,
        withTransaction: mockWithTransaction,
    },
});

const { User } = await import("../../src/main/ts/models/User.ts");

// --- Helpers ---

function resetAll() {
    mockQuery.mock.resetCalls();
    mockQuery.mock.mockImplementation(async () => []);
    mockWithTransaction.mock.resetCalls();
    mockClientQuery.mock.resetCalls();
    mockClientQuery.mock.mockImplementation(async () => ({ rows: [{ id: 42 }] }));
    mockWithTransaction.mock.mockImplementation(async (fn) => fn({ query: mockClientQuery }));
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

const validUserInput = {
    firstname: "Jane",
    lastname: "Doe",
    email: "jane@example.com",
    address1: "1 Main",
    address2: "Apt 2",
    city: "Springfield",
    state: "IL",
    level: "Free",
};

const validUpdatePayload = {
    identifier: "uid-1",
    firstname: "Jane",
    lastname: "Doe",
    email: "jane@example.com",
    address1: "1 Main",
    address2: "Apt 2",
    city: "Springfield",
    state: "IL",
    level: "Free",
    message: "",
    session: "sess-1",
};

// --- Constructor + toJSON ---

describe("new User()", () => {
    beforeEach(() => {
        resetAll();
    });

    it("derives emailID and emailHost from the email", async () => {
        const user = await User.create({ ...validUserInput });
        const json = user.toJSON();
        assert.equal(json.emailID, "jane");
        assert.equal(json.emailHost, "example.com");
        assert.equal(json.email, "jane@example.com");
    });

    it("defaults level to FREE when falsy", async () => {
        const user = await User.create({ ...validUserInput, level: "" });
        assert.equal(user.toJSON().level, "Free");
    });

    it("rejects an unknown level with 400 'Missing JSON Data'", async () => {
        await expectStatus(
            User.create({ ...validUserInput, level: "Platinum" }),
            400,
            /Missing JSON Data/,
        );
    });

    it("generates a UUID-shaped identifier", async () => {
        const user = await User.create({ ...validUserInput });
        assert.match(user.toJSON().identifier, /^[0-9a-f-]{36}$/);
    });

    it("exposes firstname/lastname in toJSON", async () => {
        const user = await User.create({ ...validUserInput, firstname: "Alex", lastname: "Kim" });
        const json = user.toJSON();
        assert.equal(json.firstname, "Alex");
        assert.equal(json.lastname, "Kim");
    });

    it("schedules a DB insert via withTransaction", async () => {
        await User.create({ ...validUserInput });
        assert.equal(mockWithTransaction.mock.callCount(), 1);
    });

    it("sends INSERT with the mapped values to the transaction client", async () => {
        await User.create({ ...validUserInput });
        assert.equal(mockClientQuery.mock.callCount(), 1);
        const [sql, params] = mockClientQuery.mock.calls[0]!.arguments as [string, unknown[]];
        assert.match(sql, /INSERT INTO users/);
        assert.equal(params[0], "jane@example.com");
        assert.equal(params[1], "example.com");
        assert.equal(params[2], "jane");
        assert.equal(params[3], "Jane");
        assert.equal(params[4], "Doe");
        assert.equal(params[6], "1 Main");
        assert.equal(params[10], "Free");
    });
});

// --- fetchById ---

describe("User.fetchById", () => {
    const row = {
        id: 7,
        email: "jane@example.com",
        firstname: "Jane",
        lastname: "Doe",
        user_identifier: "uid-1",
        address1: "1 Main",
        address2: "Apt 2",
        city: "Springfield",
        state: "IL",
        level: "Free",
    };

    beforeEach(() => {
        resetAll();
    });

    it("returns the mapped user when a row exists", async () => {
        mockQuery.mock.mockImplementation(async () => [row]);
        const result = await User.fetchById("uid-1");
        assert.equal(result.id, 7);
        assert.equal(result.identifier, "uid-1");
        assert.equal(result.firstname, "Jane");
        assert.equal(result.email, "jane@example.com");
        assert.equal(result.level, "Free");
    });

    it("forwards the identifier to the SQL query", async () => {
        mockQuery.mock.mockImplementation(async () => [row]);
        await User.fetchById("uid-1");
        const [sql, params] = mockQuery.mock.calls[0]!.arguments as [string, unknown[]];
        assert.match(sql, /SELECT .* FROM users WHERE user_identifier = \$1/);
        assert.deepEqual(params, ["uid-1"]);
    });

    it("throws 404 when no row is found", async () => {
        mockQuery.mock.mockImplementation(async () => []);
        await expectStatus(User.fetchById("missing"), 404, /not found/);
    });

    it("re-throws HTMLStatusError unchanged", async () => {
        mockQuery.mock.mockImplementation(async () => {
            throw new HTMLStatusError("Forced 404", 404);
        });
        await expectStatus(User.fetchById("uid-1"), 404, /Forced 404/);
    });

    it("wraps non-HTMLStatusError as 500", async () => {
        mockQuery.mock.mockImplementation(async () => {
            throw new Error("db down");
        });
        await expectStatus(User.fetchById("uid-1"), 500, /Internal Server Error/);
    });

    it("throws 500 when the DB returns an unexpected level", async () => {
        mockQuery.mock.mockImplementation(async () => [{ ...row, level: "Platinum" }]);
        await expectStatus(User.fetchById("uid-1"), 500, /Internal Server Error/);
    });
});

// --- updateUser ---

describe("User.updateUser", () => {
    beforeEach(() => {
        resetAll();
        mockQuery.mock.mockImplementation(async () => [{ user_identifier: "uid-1" }]);
    });

    for (const field of ["identifier", "firstname", "lastname", "email",
                         "address1", "city", "state", "level"] as const) {
        it(`rejects missing ${field} with 400 'Missing JSON Data'`, async () => {
            const partial: Record<string, unknown> = { ...validUpdatePayload };
            delete partial[field];
            await expectStatus(User.updateUser(partial as never), 400, /Missing JSON Data/);
        });
    }

    it("rejects malformed email with 400 'Missing JSON Data'", async () => {
        await expectStatus(
            User.updateUser({ ...validUpdatePayload, email: "nothing" } as never),
            400,
            /Missing JSON Data/,
        );
    });

    it("rejects unknown level with 400 'Missing JSON Data'", async () => {
        await expectStatus(
            User.updateUser({ ...validUpdatePayload, level: "Platinum" } as never),
            400,
            /Missing JSON Data/,
        );
    });

    it("issues an UPDATE with the mapped values", async () => {
        await User.updateUser(validUpdatePayload as never);
        assert.equal(mockQuery.mock.callCount(), 1);
        const [sql, params] = mockQuery.mock.calls[0]!.arguments as [string, unknown[]];
        assert.match(sql, /UPDATE users SET/);
        assert.match(sql, /RETURNING user_identifier/);
        assert.deepEqual(params, [
            "jane@example.com", "jane", "example.com",
            "Jane", "Doe",
            "1 Main", "Apt 2", "Springfield", "IL",
            "Free",
            "uid-1",
        ]);
    });

    it("throws 404 when no row matches the identifier", async () => {
        mockQuery.mock.mockImplementation(async () => []);
        await expectStatus(User.updateUser(validUpdatePayload as never), 404, /User not found/);
    });

    it("wraps DB errors as 500", async () => {
        mockQuery.mock.mockImplementation(async () => {
            throw new Error("db down");
        });
        await expectStatus(User.updateUser(validUpdatePayload as never), 500, /Internal Server Error/);
    });
});

// --- deleteUser ---

describe("User.deleteUser", () => {
    beforeEach(() => {
        resetAll();
        mockQuery.mock.mockImplementation(async () => [{ user_identifier: "uid-1" }]);
    });

    it("rejects missing identifier with 400 'Missing JSON Data'", async () => {
        await expectStatus(User.deleteUser({} as never), 400, /Missing JSON Data/);
    });

    it("issues a soft-delete UPDATE when identifier is provided", async () => {
        await User.deleteUser({ identifier: "uid-1" } as never);
        assert.equal(mockQuery.mock.callCount(), 1);
        const [sql, params] = mockQuery.mock.calls[0]!.arguments as [string, unknown[]];
        assert.match(sql, /UPDATE users SET deleted=TRUE WHERE user_identifier = \$1 RETURNING user_identifier/);
        assert.deepEqual(params, ["uid-1"]);
    });

    it("throws 404 when no row matches the identifier", async () => {
        mockQuery.mock.mockImplementation(async () => []);
        await expectStatus(
            User.deleteUser({ identifier: "missing" } as never),
            404,
            /User not found/,
        );
    });

    it("wraps DB errors as 500", async () => {
        mockQuery.mock.mockImplementation(async () => {
            throw new Error("db down");
        });
        await expectStatus(
            User.deleteUser({ identifier: "uid-1" } as never),
            500,
            /Internal Server Error/,
        );
    });
});

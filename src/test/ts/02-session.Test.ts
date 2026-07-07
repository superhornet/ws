import { suite, test, after } from "node:test";
import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { router as sessionRouter } from "../../main/ts/controllers/SessionController.ts";
import { router as userRouter } from "../../main/ts/controllers/UserController.ts";
import { Session } from "../../main/ts/models/Session.ts";
import { query } from "../../main/ts/libs/postgresDB.ts";
import { findRouteHandler, mockSession, mockUser } from "./mocks.ts";
import { SubscriptionType } from "../../main/ts/types/SubscriptionTypes.ts";

// Run-unique suffix so re-running against a persistent DB does not collide on
// the users' unique email constraint.
const RUN = Date.now();

async function getSession() {
    const handler = findRouteHandler(sessionRouter, 'get', '/session');
    assert.ok(handler, "Missing handler for GET /api/session");
    const { req, res } = mockSession();
    // @ts-expect-error req is fine as-is
    await handler(req, res, () => null);
    return res;
}

/** Creates a fresh session and returns its UUID. */
async function newSessionUuid(): Promise<string> {
    return (await getSession()).body.data.uuid;
}

/**
 * Signs up a user on its own session and returns the user_identifier, so
 * bindUser/getUserForSession tests have a real user to bind to (sessions.
 * user_identifier has a foreign key to users).
 */
async function createUserIdentifier(label: string): Promise<string> {
    const session = await newSessionUuid();
    const handler = findRouteHandler(userRouter, 'post', '/user');
    assert.ok(handler, "Missing handler for user post");
    const { req, res } = mockUser({
        body: {
            data: {
                firstname: "Sess",
                lastname: "Tester",
                email: `${label}.${RUN}@westack.cash`,
                address1: "1 Test St",
                address2: "",
                city: "Testville",
                state: "FL",
                zipcode: "33101",
                subscription_level: SubscriptionType.PRO,
            },
            message: `Signup ${label}`,
            session,
        },
    });
    // @ts-expect-error req is fine as-is
    await handler(req, res, null);
    assert.equal(res.statusCode, 201);
    return res.body.data.user_identifier;
}

/** Inserts an already-expired session directly and returns its UUID. */
async function seedExpiredSession(): Promise<string> {
    const inserted = await query<{ uuid: string }>(
        `INSERT INTO sessions (otp, expires) VALUES ($1, NOW() - INTERVAL '1 hour') RETURNING uuid;`,
        ["EXPIRE"]
    );
    const uuid = inserted.at(0)?.uuid;
    assert.ok(uuid, "Failed to seed an expired session");
    return uuid;
}

async function deleteSession() {
    const handler = findRouteHandler(sessionRouter, 'delete', '/session');
    assert.ok(handler, "Missing handler for DELETE /api/session");
    const { req, res } = mockSession();
    // @ts-expect-error req is fine as-is
    await handler(req, res, () => null);
    return res;
}

suite("Session routes: GET /api/session", () => {
    test("returns 200 OK with a fresh session and OTP", async () => {
        const res = await getSession();
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.code, 200);
        assert.equal(res.body.message, 'OK');
    });

    test("returns a valid UUID session identifier", async () => {
        const res = await getSession();
        assert.equal(res.body.data.uuid.length, 36);
        assert.match(res.body.data.uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    test("returns a 6-character uppercase alphanumeric OTP", async () => {
        const res = await getSession();
        assert.equal(res.body.data.otp.length, 6);
        assert.match(res.body.data.otp, /^[0-9A-Z]{6}$/);
    });

    test("returns an expiry in the future", async () => {
        const res = await getSession();
        assert.ok(new Date(res.body.data.expires).getTime() > Date.now());
    });
});

suite("Session routes: GET /api/session uniqueness", () => {
    test("two sessions have distinct uuids and otps", async () => {
        const first = (await getSession()).body.data;
        const second = (await getSession()).body.data;
        assert.notEqual(first.uuid, second.uuid);
        assert.notEqual(first.otp, second.otp);
    });
});

suite("Session routes: DELETE /api/session", () => {
    test("returns 204 No Content", async () => {
        const res = await deleteSession();
        assert.equal(res.statusCode, 204);
        assert.equal(res.body.code, 204);
        assert.equal(res.body.message, 'No Content');
        assert.equal(res.body.data, null);
    });

    // DELETE /session takes no session parameter: it is a global prune of every
    // expired session, not a logout of the caller. This pins that surprising
    // semantic — a fresh session survives the call while an expired one is gone.
    test("is a global prune of expired sessions, not a logout of the caller", async () => {
        const fresh = await newSessionUuid();
        const expired = await seedExpiredSession();

        const res = await deleteSession();
        assert.equal(res.statusCode, 204);

        assert.equal(await Session.exists(fresh), true, "caller's fresh session should survive");
        assert.equal(await Session.exists(expired), false, "expired session should be pruned");
    });
});

suite("Session.exists() validates a session against the database", () => {
    test("returns true for a valid, unexpired session", async () => {
        const uuid = await newSessionUuid();
        assert.equal(await Session.exists(uuid), true);
    });

    test("returns false for an expired session", async () => {
        const uuid = await seedExpiredSession();
        assert.equal(await Session.exists(uuid), false);
    });

    test("returns false for a well-formed but nonexistent (forged) UUID", async () => {
        assert.equal(await Session.exists(randomUUID()), false);
    });

    test("returns false for a malformed-length token without hitting the database", async () => {
        assert.equal(await Session.exists("not-a-uuid"), false);
        assert.equal(await Session.exists(""), false);
        // @ts-expect-error exercising the undefined guard
        assert.equal(await Session.exists(undefined), false);
    });
});

suite("Session.bindUser() and getUserForSession()", () => {
    test("a freshly created session is anonymous (no bound user)", async () => {
        const uuid = await newSessionUuid();
        assert.equal(await Session.getUserForSession(uuid), null);
    });

    test("binding a session resolves that session to the user", async () => {
        const uuid = await newSessionUuid();
        const user = await createUserIdentifier("bind.roundtrip");
        await Session.bindUser(uuid, user);
        assert.equal(await Session.getUserForSession(uuid), user);
    });

    test("bindUser throws 400 for a malformed-length session", async () => {
        const user = await createUserIdentifier("bind.badlen");
        await assert.rejects(
            () => Session.bindUser("too-short", user),
            (error: unknown) => (error as { statusCode?: number }).statusCode === 400,
        );
    });

    test("bindUser throws 404 for a well-formed but nonexistent session", async () => {
        const user = await createUserIdentifier("bind.notfound");
        await assert.rejects(
            () => Session.bindUser(randomUUID(), user),
            (error: unknown) => (error as { statusCode?: number }).statusCode === 404,
        );
    });

    test("getUserForSession returns null for malformed, expired, or nonexistent sessions", async () => {
        assert.equal(await Session.getUserForSession("not-a-uuid"), null);
        assert.equal(await Session.getUserForSession(undefined), null);
        assert.equal(await Session.getUserForSession(randomUUID()), null);
        assert.equal(await Session.getUserForSession(await seedExpiredSession()), null);
    });
});

suite("Session.kill() prunes expired sessions", () => {
    test("deletes sessions whose expiry is in the past", async () => {
        const inserted = await query<{ uuid: string }>(
            `INSERT INTO sessions (otp, expires) VALUES ($1, NOW() - INTERVAL '1 hour') RETURNING uuid;`,
            ["EXPIRE"]
        );
        const expiredUuid = inserted.at(0)?.uuid;
        assert.ok(expiredUuid, "Failed to seed an expired session");

        await Session.kill();

        const remaining = await query<{ uuid: string }>(
            `SELECT uuid FROM sessions WHERE uuid = $1;`,
            [expiredUuid]
        );
        assert.equal(remaining.length, 0);
    });

    test("leaves unexpired sessions intact", async () => {
        const created = await Session.create();

        await Session.kill();

        const remaining = await query<{ uuid: string }>(
            `SELECT uuid FROM sessions WHERE uuid = $1;`,
            [created.uuid]
        );
        assert.equal(remaining.length, 1);
    });
});

after(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    process.emit('beforeExit');
});

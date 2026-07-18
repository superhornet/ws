import { after, describe, test } from "node:test";
import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { router as sessionRouter } from "../../main/ts/controllers/SessionController.ts";
import { router as userRouter } from "../../main/ts/controllers/UserController.ts";
import { findRouteHandler, mockGetRequest, mockSession, mockUser } from './mocks.ts'
import { SubscriptionType } from "../../main/ts/types/SubscriptionTypes.ts";
import { type UserAPIType } from "../../main/ts/types/UserAPITypes.ts";

let sharedSession: string = "";
let regularSession: string = "";
let adminUser: string = "";
let regularUser: string = "";

/**
 * Each session can be bound to exactly one user (at signup), so tests that need
 * multiple users create a fresh session per user.
 */
async function createSession(): Promise<string> {
    const handler = findRouteHandler(sessionRouter, 'get', '/session');
    assert.ok(handler, "Missing handler for session get");
    const { req, res } = mockSession();
    // @ts-expect-error req is fine as-is
    await handler(req, res, () => null);
    return (res.body.data).uuid;
}

describe("Get a session", async () => {
    sharedSession = await createSession();
});

describe("Testing the /api/user endpoint", () => {

    test("Error 400 response when missing body of POST method", async () => {
        const handler = findRouteHandler(userRouter, 'post', '/user');
        assert.ok(handler, "Missing handler for user endpoint");
        const { req, res } = mockUser({});
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Empty JSON body');
    });
    test("Error 403 Session ID Required when the session is missing on POST", async () => {
        const handler = findRouteHandler(userRouter, 'post', '/user');
        assert.ok(handler, "Missing handler for user endpoint");
        const { req, res } = mockUser({ body: { data: "" as unknown as UserAPIType, message: "Test missing session", session: "" } });

        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session ID Required');
    });
    test("Insert admin account", async () => {
        const handler = findRouteHandler(userRouter, 'post', '/user');
        assert.ok(handler, "Missing handler for user endpoint");
        const { req, res } = mockUser(
            {
                body: {
                    data: {
                        firstname: "WeStack",
                        lastname: "Admin",
                        email: "admin@westack.cash",
                        address1: "100 WeStack Trace",
                        address2: "STE 600",
                        city: "Tampa",
                        state: "FL",
                        zipcode: "44333-1926",
                        subscription_level: SubscriptionType.PRO,
                    },
                    message: "System Account",
                    session: sharedSession,
                }
            });

        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 201);
        assert.equal(res.body.message, 'Created');
        adminUser = res.body.data.user_identifier;
        assert.equal(adminUser.length, 36);
    });
    test("inserts first sample record", async () => {
        const handler = findRouteHandler(userRouter, 'post', '/user');
        assert.ok(handler, "Missing handler for user endpoint");
        // A bound session cannot create a second user, so this user signs up on
        // its own fresh session.
        regularSession = await createSession();
        const { req, res } = mockUser(
            {
                body: {
                    data: {
                        firstname: "Pamalamalam",
                        lastname: "Okfango",
                        email: "onlypam@protonmail.com",
                        address1: "123 Main St.",
                        address2: "",
                        city: "Wakanda Heights",
                        state: "NE",
                        zipcode: "12345",
                        subscription_level: SubscriptionType.FREE,
                    },
                    message: "Bare API Creation",
                    session: regularSession,
                }
            });

        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 201);
        assert.equal(res.body.message, 'Created');
        regularUser = res.body.data.user_identifier;

    });
    test("response is 201 Created when supply appropriate data", async () => {
        const handler = findRouteHandler(userRouter, 'post', '/user');
        assert.ok(handler, "Missing handler for user endpoint");
        const peterSession = await createSession();
        const { req, res } = mockUser(
            {
                body: {
                    data: {
                        firstname: "Peter",
                        lastname: "Pablo",
                        email: "peteypablo@nolimit.com",
                        address1: "123 Main Street",
                        address2: "",
                        city: "New Orleans",
                        state: "LA",
                        zipcode: "54321",
                        subscription_level: SubscriptionType.BASIC
                    },
                    message: "Test Sucessful response",
                    session: peterSession,
                }
            });

        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 201);
        assert.equal(res.body.message, 'Created');
    });
    test("response is 200 OK and contains data.", async () => {
        const handler = findRouteHandler(userRouter, 'get', '/user');
        assert.ok(handler, "Missing handler for user endpoint");
        const { req, res } = mockGetRequest({
            headers: { "x-session": regularSession },
            query: {
                user_identifier: regularUser,
                message: `Fetch user ${regularUser}`,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.message, 'OK');
        const fetched = res.body.data as unknown as UserAPIType;
        assert.equal(fetched.user_identifier, regularUser);
        assert.equal(fetched.email, "onlypam@protonmail.com");
        assert.equal(fetched.affiliate?.length, 7);
    });
    test(`Update/modify user record. Response is 202 Accepted and contains data`, async () => {
        const handler = findRouteHandler(userRouter, 'put', '/user');
        assert.ok(handler, "Missing handler for user endpoint");
        const { req, res } = mockUser({
            body: {
                data: {
                    email: "king.caleb.i.bsce.mfa@gmail.com",
                    firstname: "Caleb",
                    lastname: "King",
                    address1: "125 Atlantic Ave",
                    address2: "STE 9A",
                    city: "Delray Beach",
                    state: "FL",
                    zipcode: "33444-1444",
                    subscription_level: SubscriptionType.BASIC,
                },
                message: `Update user ${regularUser}`,
                session: regularSession,
                user_identifier: regularUser,
            }
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 202);
        assert.equal(res.body.message, 'Accepted');
    });
    test(`Delete user record. Response is 204 No Content`, async () => {
        const handler = findRouteHandler(userRouter, 'delete', '/user');
        assert.ok(handler, "Missing handler for user endpoint");
        const { req, res } = mockUser({
            body: {
                message: `Delete ${regularUser}`,
                session: regularSession,
                user_identifier: regularUser,
            }
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 204);
        assert.equal(res.body.message, 'No Content');
    });
});

/**
 * Signs up a fresh user on its own session and returns both, so authorization
 * tests can act as (or against) a specific bound user.
 */
async function createBoundUser(email: string): Promise<{ session: string; user_identifier: string }> {
    const session = await createSession();
    const handler = findRouteHandler(userRouter, 'post', '/user');
    assert.ok(handler, "Missing handler for user endpoint");
    const { req, res } = mockUser({
        body: {
            data: {
                firstname: "Bound",
                lastname: "User",
                email,
                address1: "1 Test St",
                address2: "",
                city: "Testville",
                state: "FL",
                zipcode: "33101",
                subscription_level: SubscriptionType.FREE,
            },
            message: `Signup ${email}`,
            session,
        },
    });
    // @ts-expect-error req is fine as-is
    await handler(req, res, null);
    assert.equal(res.statusCode, 201);
    return { session, user_identifier: res.body.data.user_identifier };
}

describe("Testing /api/user authorization and edge cases", () => {
    test("GET /me returns the user the session is bound to", async () => {
        const { session, user_identifier } = await createBoundUser("me.route@westack.cash");
        const handler = findRouteHandler(userRouter, 'get', '/me');
        assert.ok(handler, "Missing handler for user endpoint");
        const { req, res } = mockGetRequest({ headers: { "x-session": session } });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 200);
        assert.equal((res.body.data as { user_identifier: string }).user_identifier, user_identifier);
    });

    test("GET /me is 403 on a session with no user bound", async () => {
        const anonymousSession = await createSession();
        const handler = findRouteHandler(userRouter, 'get', '/me');
        assert.ok(handler, "Missing handler for user endpoint");
        const { req, res } = mockGetRequest({ headers: { "x-session": anonymousSession } });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session is not associated with a user');
    });

    test("POST /user is 409 when the session is already bound to a user", async () => {
        const { session } = await createBoundUser("already.bound@westack.cash");
        const handler = findRouteHandler(userRouter, 'post', '/user');
        assert.ok(handler, "Missing handler for user endpoint");
        const { req, res } = mockUser({
            body: {
                data: {
                    firstname: "Second",
                    lastname: "Signup",
                    email: "second.signup@westack.cash",
                    address1: "2 Test St",
                    address2: "",
                    city: "Testville",
                    state: "FL",
                    zipcode: "33101",
                    subscription_level: SubscriptionType.FREE,
                },
                message: "Second signup on a bound session",
                session,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 409);
        assert.equal(res.body.message, 'Session is already associated with a user');
    });

    test("POST /user is 400 when the supplied fields are invalid", async () => {
        const session = await createSession();
        const handler = findRouteHandler(userRouter, 'post', '/user');
        assert.ok(handler, "Missing handler for user endpoint");
        const { req, res } = mockUser({
            body: {
                data: {
                    firstname: "X",
                    lastname: "User",
                    email: "invalid.fields@westack.cash",
                    address1: "1 Test St",
                    address2: "",
                    city: "Testville",
                    state: "FL",
                    zipcode: "33101",
                    subscription_level: SubscriptionType.FREE,
                },
                message: "Invalid signup",
                session,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'User fields are invalid');
    });

    test("GET /user is 400 when the identifier is missing", async () => {
        const { session } = await createBoundUser("missing.id@westack.cash");
        const handler = findRouteHandler(userRouter, 'get', '/user');
        assert.ok(handler, "Missing handler for user endpoint");
        const { req, res } = mockGetRequest({ headers: { "x-session": session } });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'User identifier is required');
    });

    test("GET /user cannot read another user's record (403)", async () => {
        const attacker = await createBoundUser("attacker.get@westack.cash");
        const victim = await createBoundUser("victim.get@westack.cash");
        const handler = findRouteHandler(userRouter, 'get', '/user');
        assert.ok(handler, "Missing handler for user endpoint");
        const { req, res } = mockGetRequest({
            headers: { "x-session": attacker.session },
            query: { user_identifier: victim.user_identifier },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Forbidden');
    });

    test("PUT /user cannot modify another user's record (403)", async () => {
        const attacker = await createBoundUser("attacker.put@westack.cash");
        const victim = await createBoundUser("victim.put@westack.cash");
        const handler = findRouteHandler(userRouter, 'put', '/user');
        assert.ok(handler, "Missing handler for user endpoint");
        const { req, res } = mockUser({
            body: {
                data: {
                    firstname: "Mallory",
                    lastname: "Hacker",
                    email: "mallory@westack.cash",
                    address1: "1 Evil St",
                    address2: "",
                    city: "Nowhere",
                    state: "FL",
                    zipcode: "33101",
                    subscription_level: SubscriptionType.FREE,
                },
                message: `Update ${victim.user_identifier}`,
                session: attacker.session,
                user_identifier: victim.user_identifier,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Forbidden');
    });

    test("DELETE /user cannot delete another user's record (403)", async () => {
        const attacker = await createBoundUser("attacker.del@westack.cash");
        const victim = await createBoundUser("victim.del@westack.cash");
        const handler = findRouteHandler(userRouter, 'delete', '/user');
        assert.ok(handler, "Missing handler for user endpoint");
        const { req, res } = mockUser({
            body: {
                message: `Delete ${victim.user_identifier}`,
                session: attacker.session,
                user_identifier: victim.user_identifier,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Forbidden');
    });

    test("GET /user for a deleted user is 404", async () => {
        const { session, user_identifier } = await createBoundUser("deleted.user@westack.cash");

        const deleteHandler = findRouteHandler(userRouter, 'delete', '/user');
        assert.ok(deleteHandler, "Missing handler for user endpoint");
        const del = mockUser({ body: { message: `Delete ${user_identifier}`, session, user_identifier } });
        // @ts-expect-error req is fine as-is
        await deleteHandler(del.req, del.res, null);
        assert.equal(del.res.statusCode, 204);

        const getHandler = findRouteHandler(userRouter, 'get', '/user');
        assert.ok(getHandler, "Missing handler for user endpoint");
        const { req, res } = mockGetRequest({
            headers: { "x-session": session },
            query: { user_identifier },
        });
        // @ts-expect-error req is fine as-is
        await getHandler(req, res, null);
        assert.equal(res.statusCode, 404);
        assert.equal(res.body.message, 'User not found');
    });

    test("POST /user is 403 Unauthorized for a forged (well-formed but unknown) session", async () => {
        const handler = findRouteHandler(userRouter, 'post', '/user');
        assert.ok(handler, "Missing handler for user endpoint");
        const { req, res } = mockUser({
            body: {
                data: {
                    firstname: "Forged",
                    lastname: "Session",
                    email: "forged.session@westack.cash",
                    address1: "1 Test St",
                    address2: "",
                    city: "Testville",
                    state: "FL",
                    zipcode: "33101",
                    subscription_level: SubscriptionType.FREE,
                },
                message: "Forged session signup",
                session: randomUUID(),
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Unauthorized');
    });

    test("PUT /user is 400 when the updated fields are invalid", async () => {
        const { session, user_identifier } = await createBoundUser("put.invalid@westack.cash");
        const handler = findRouteHandler(userRouter, 'put', '/user');
        assert.ok(handler, "Missing handler for user endpoint");
        const { req, res } = mockUser({
            body: {
                data: {
                    firstname: "X", // too short for the update validator
                    lastname: "User",
                    email: "put.invalid@westack.cash",
                    address1: "1 Test St",
                    address2: "",
                    city: "Testville",
                    state: "FL",
                    zipcode: "33101",
                    subscription_level: SubscriptionType.FREE,
                },
                message: `Update ${user_identifier}`,
                session,
                user_identifier,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'User fields are invalid');
    });

    test("PUT /user is 400 when the body is empty", async () => {
        const handler = findRouteHandler(userRouter, 'put', '/user');
        assert.ok(handler, "Missing handler for user endpoint");
        const { req, res } = mockUser({});
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Empty JSON body');
    });

    test("PUT /user is 400 when the body has no data", async () => {
        const handler = findRouteHandler(userRouter, 'put', '/user');
        assert.ok(handler, "Missing handler for user endpoint");
        const { req, res } = mockUser({
            body: { message: "Malformed body", session: "not-checked", user_identifier: "" },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'User fields are invalid');
    });

    test("POST /user is 400 when the body has no data", async () => {
        const session = await createSession();
        const handler = findRouteHandler(userRouter, 'post', '/user');
        assert.ok(handler, "Missing handler for user endpoint");
        const { req, res } = mockUser({
            body: { message: "Malformed signup", session },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'User fields are invalid');
    });

    test("DELETE /user is 400 when the body is empty", async () => {
        const handler = findRouteHandler(userRouter, 'delete', '/user');
        assert.ok(handler, "Missing handler for user endpoint");
        const { req, res } = mockUser({});
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Empty JSON body');
    });

    test("GET /me is 403 Session ID Required when no session is supplied", async () => {
        const handler = findRouteHandler(userRouter, 'get', '/me');
        assert.ok(handler, "Missing handler for user endpoint");
        const { req, res } = mockGetRequest({});
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session ID Required');
    });

    test("POST /user stores HTML-stripped name fields", async () => {
        // stripHtml is destructive: an apostrophe in a name is replaced with a
        // placeholder token before storage. Pin that observable behavior.
        const session = await createSession();
        const postHandler = findRouteHandler(userRouter, 'post', '/user');
        assert.ok(postHandler, "Missing handler for user endpoint");
        const created = mockUser({
            body: {
                data: {
                    firstname: "Anne",
                    lastname: "O'Brien",
                    email: "html.strip@westack.cash",
                    address1: "1 Test St",
                    address2: "",
                    city: "Testville",
                    state: "FL",
                    zipcode: "33101",
                    subscription_level: SubscriptionType.FREE,
                },
                message: "HTML in name",
                session,
            },
        });
        // @ts-expect-error req is fine as-is
        await postHandler(created.req, created.res, null);
        assert.equal(created.res.statusCode, 201);
        const userIdentifier = created.res.body.data.user_identifier;

        const getHandler = findRouteHandler(userRouter, 'get', '/user');
        assert.ok(getHandler, "Missing handler for user endpoint");
        const { req, res } = mockGetRequest({
            headers: { "x-session": session },
            query: { user_identifier: userIdentifier },
        });
        // @ts-expect-error req is fine as-is
        await getHandler(req, res, null);
        assert.equal(res.statusCode, 200);
        const fetched = res.body.data as unknown as UserAPIType;
        assert.equal(fetched.lastname, "O{foot_mark}Brien");
        assert.ok(!fetched.lastname.includes("'"), "Raw apostrophe should not survive sanitization");
    });
});

after( () => {
    console.log("Tests complete");
    setTimeout(() => {
        process.emit('beforeExit');
    }, 100);
});

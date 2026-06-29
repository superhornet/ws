import { after, describe, test } from "node:test";
import assert from "node:assert";
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
    test("Error 403 response when missing session of POST method", async () => {
        const handler = findRouteHandler(userRouter, 'post', '/user');
        assert.ok(handler, "Missing handler for user endpoint");
        const { req, res } = mockUser({ body: { data: "" as unknown as UserAPIType, message: "Test unauthorized response", session: "" } });

        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Unauthorized');
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
after( () => {
    console.log("Tests complete");
    process.emit('beforeExit');
});

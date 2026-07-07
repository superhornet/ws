import { describe, suite, test, after } from "node:test";
import assert from "node:assert";
import { router as sessionRouter } from "../../main/ts/controllers/SessionController.ts";
import { router as userRouter } from "../../main/ts/controllers/UserController.ts";
import { router as notificationRouter } from "../../main/ts/controllers/NotificationController.ts";
import { findRouteHandler, mockGetRequest, mockSession, mockUser, mockNotification } from './mocks.ts'
import { SubscriptionType } from "../../main/ts/types/SubscriptionTypes.ts";

async function createSession(): Promise<string> {
    const handler = findRouteHandler(sessionRouter, 'get', '/session');
    assert.ok(handler, "Missing handler for session get");
    const { req, res } = mockSession();
    // @ts-expect-error req is fine as-is
    await handler(req, res, null);
    return res.body.data.uuid;
}

/**
 * Signs up a fresh user on its own session and returns both, so authorization
 * tests can act as (or against) a specific bound user.
 */
async function createBoundUser(email: string): Promise<{ session: string; user_identifier: string }> {
    const session = await createSession();
    const handler = findRouteHandler(userRouter, 'post', '/user');
    assert.ok(handler, "Missing handler for user post");
    const { req, res } = mockUser({
        body: {
            data: {
                firstname: "Note",
                lastname: "Owner",
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

async function createNotification(session: string, user_identifier: string): Promise<string> {
    const handler = findRouteHandler(notificationRouter, 'post', '/notification');
    assert.ok(handler, "Missing handler for notification endpoint");
    const { req, res } = mockNotification({
        body: {
            data: {
                message: "Seed notification",
                notification_for: user_identifier,
                note_identifier: "",
            },
            message: "Seed notification",
            session,
        },
    });
    // @ts-expect-error req is fine as-is
    await handler(req, res, null);
    assert.equal(res.statusCode, 201);
    // @ts-expect-error note_identifier exists on data
    return res.body.data.note_identifier;
}

suite("Testing the Notification routes without session", () => {
    test("POST is 400 when the body is empty", async () => {
        const handler = findRouteHandler(notificationRouter, 'post', '/notification');
        assert.ok(handler, "Missing handler for notification endpoint");
        const { req, res } = mockNotification({});
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Empty JSON body');
    });

    test("POST is 403 when the session is missing", async () => {
        const handler = findRouteHandler(notificationRouter, 'post', '/notification');
        assert.ok(handler, "Missing handler for notification endpoint");
        const { req, res } = mockNotification({ body: { message: "Missing session" } });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session ID Required');
    });
});
suite("Testing the Notification routes authorization and edge cases", () => {
    test("POST is 403 when creating a notification for another user", async () => {
        const attacker = await createBoundUser("note.attacker.post@westack.cash");
        const victim = await createBoundUser("note.victim.post@westack.cash");
        const handler = findRouteHandler(notificationRouter, 'post', '/notification');
        assert.ok(handler, "Missing handler for notification endpoint");
        const { req, res } = mockNotification({
            body: {
                data: {
                    message: "You have been targeted.",
                    notification_for: victim.user_identifier,
                    note_identifier: "",
                },
                message: "Cross-user notification",
                session: attacker.session,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Forbidden');
    });

    test("POST is 400 when the message is invalid", async () => {
        const { session, user_identifier } = await createBoundUser("note.badmsg@westack.cash");
        const handler = findRouteHandler(notificationRouter, 'post', '/notification');
        assert.ok(handler, "Missing handler for notification endpoint");
        const { req, res } = mockNotification({
            body: {
                data: {
                    message: "a",
                    notification_for: user_identifier,
                    note_identifier: "",
                },
                message: "Invalid message",
                session,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Notification message is invalid');
    });

    test("POST is 403 on a session with no user bound", async () => {
        const anonymousSession = await createSession();
        const handler = findRouteHandler(notificationRouter, 'post', '/notification');
        assert.ok(handler, "Missing handler for notification endpoint");
        const { req, res } = mockNotification({
            body: {
                data: {
                    message: "Anonymous attempt.",
                    notification_for: anonymousSession,
                    note_identifier: "",
                },
                message: "Anonymous notification",
                session: anonymousSession,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session is not associated with a user');
    });

    test("GET /notifications is 403 when listing another user's notifications", async () => {
        const attacker = await createBoundUser("note.attacker.get@westack.cash");
        const victim = await createBoundUser("note.victim.get@westack.cash");
        const handler = findRouteHandler(notificationRouter, 'get', '/notifications');
        assert.ok(handler, "Missing handler for notification endpoint");
        const { req, res } = mockGetRequest({
            headers: { "x-session": attacker.session },
            query: { notification_for: victim.user_identifier },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Forbidden');
    });

    test("GET /notifications is 400 when the recipient is missing", async () => {
        const { session } = await createBoundUser("note.norcpt@westack.cash");
        const handler = findRouteHandler(notificationRouter, 'get', '/notifications');
        assert.ok(handler, "Missing handler for notification endpoint");
        const { req, res } = mockGetRequest({ headers: { "x-session": session } });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Notification recipient is required');
    });

    test("PUT /notification updates the caller's own notification", async () => {
        const { session, user_identifier } = await createBoundUser("note.update@westack.cash");
        await createNotification(session, user_identifier);
        const handler = findRouteHandler(notificationRouter, 'put', '/notification');
        assert.ok(handler, "Missing handler for notification endpoint");
        const { req, res } = mockNotification({
            body: {
                data: {
                    message: "Updated message body.",
                    notification_for: user_identifier,
                    note_identifier: "",
                },
                message: "Update notifications",
                session,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 202);
        assert.equal(res.body.message, 'Accepted');
    });

    test("PUT /notification/:id marks a notification unseen when id is not truthy", async () => {
        const { session, user_identifier } = await createBoundUser("note.unseen@westack.cash");
        const note = await createNotification(session, user_identifier);
        const handler = findRouteHandler(notificationRouter, 'put', '/notification/:id');
        assert.ok(handler, "Missing handler for notification endpoint");
        const { req, res } = mockNotification({
            params: { id: 2 },
            body: {
                data: {
                    message: "",
                    notification_for: user_identifier,
                    note_identifier: note,
                },
                message: `Unmark ${note}`,
                session,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 202);
        assert.equal(res.body.message, 'Accepted');
    });

    test("PUT /notification/:id is 403 on another user's notification", async () => {
        const attacker = await createBoundUser("note.attacker.put@westack.cash");
        const victim = await createBoundUser("note.victim.put@westack.cash");
        const victimNote = await createNotification(victim.session, victim.user_identifier);
        const handler = findRouteHandler(notificationRouter, 'put', '/notification/:id');
        assert.ok(handler, "Missing handler for notification endpoint");
        const { req, res } = mockNotification({
            params: { id: 1 },
            body: {
                data: {
                    message: "",
                    notification_for: victim.user_identifier,
                    note_identifier: victimNote,
                },
                message: `Marking ${victimNote} read`,
                session: attacker.session,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Forbidden');
    });

    test("DELETE is 403 on another user's notification", async () => {
        const attacker = await createBoundUser("note.attacker.del@westack.cash");
        const victim = await createBoundUser("note.victim.del@westack.cash");
        const victimNote = await createNotification(victim.session, victim.user_identifier);
        const handler = findRouteHandler(notificationRouter, 'delete', '/notification');
        assert.ok(handler, "Missing handler for notification endpoint");
        const { req, res } = mockNotification({
            body: {
                data: {
                    message: "",
                    notification_for: victim.user_identifier,
                    note_identifier: victimNote,
                },
                message: `Deleting ${victimNote}`,
                session: attacker.session,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Forbidden');
    });
});
suite("Testing the Notification routes with session", () => {
    describe("Get a session", async () => {
        const handler = findRouteHandler(sessionRouter, 'get', '/session');
        assert.ok(handler, "Missing handler for session post");

        const { req, res } = mockSession();
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        const sharedSession = res.body.data.uuid;
        describe("Create a user", async () => {
            const handler = findRouteHandler(userRouter, 'post', '/user');
            assert.ok(handler, "Missing handler for user post");

            const { req, res } = mockUser({
                body: {
                    data: {
                        firstname: "Chad",
                        lastname: "Palmantieri",
                        email: "chadnotreal@gmail.com",
                        address1: "918 US Highway 441",
                        address2: "",
                        city: "Orlando",
                        state: "FL",
                        zipcode: "12345",
                        subscription_level: SubscriptionType.PRO
                    },
                    message: "New User dialog",
                    session: sharedSession,
                }
            });
            // @ts-expect-error req is fine as-is
            await handler(req, res, null);
            assert.equal(res.statusCode, 201);
            assert.equal(res.body.message, 'Created');
            const sharedUser = res.body.data.user_identifier;
            let sharedNotification: string;
            test("Create a sample notification", async () => {
                const handler = findRouteHandler(notificationRouter, 'post', '/notification');
                assert.ok(handler, "Missing handler for notification endpoint");
                const { req, res } = mockNotification({
                    body: {
                        data: {
                            message: "Knowledge is half the battle.",
                            notification_for: sharedUser,
                            note_identifier: ""
                        },
                        message: "Generated message",
                        session: sharedSession,
                    }
                });

                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                assert.equal(res.statusCode, 201);
                assert.equal(res.body.message, 'Created');
                // @ts-expect-error note_identifier exists on data
                sharedNotification = res.body.data.note_identifier;
            });
            test("Create another sample notification", async () => {
                const handler = findRouteHandler(notificationRouter, 'post', '/notification');
                assert.ok(handler, "Missing handler for notification endpoint");
                const { req, res } = mockNotification({
                    body: {
                        data: {
                            message: "And that's one to grow on.",
                            notification_for: sharedUser
                        },
                        message: "Also a generated message",
                        session: sharedSession,
                    }
                });

                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                assert.equal(res.statusCode, 201);
                assert.equal(res.body.message, 'Created');
            });
            test("List Notifications", { skip: false }, async () => {
                const handler = findRouteHandler(notificationRouter, 'get', '/notifications');
                assert.ok(handler, "Missing handler for notification endpoint");
                const { req, res } = mockGetRequest({
                    headers: { "x-session": sharedSession },
                    query: {
                        notification_for: sharedUser,
                        message: "List notifications",
                    },
                });
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                assert.equal(res.statusCode, 200);
                assert.equal(res.body.message, 'OK');
                assert.equal((res.body.data as unknown[]).length, 2);
            });
            test("Mark a notification as read", { skip: false }, async () => {
                const handler = findRouteHandler(notificationRouter, 'put', '/notification/:id');
                assert.ok(handler, "Missing handler for notification endpoint");
                const { req, res } = mockNotification({
                    params: {
                        id: 1
                    },
                    body: {
                        data: {
                            message: "",
                            note_identifier: sharedNotification
                        },
                        message: `Marking ${sharedNotification} read`,
                        session: sharedSession,
                    }
                });

                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                assert.equal(res.statusCode, 202);
                assert.equal(res.body.message, 'Accepted');
            });
            test("Delete a notification", { skip: false }, async () => {
                const handler = findRouteHandler(notificationRouter, 'delete', '/notification');
                assert.ok(handler, "Missing handler for notification endpoint");
                const { req, res } = mockNotification({
                    body: {
                        data: {
                            message: "",
                            note_identifier: sharedNotification
                        },
                        message: `Deleting Notification ${sharedNotification}`,
                        session: sharedSession
                    }
                });

                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                assert.equal(res.statusCode, 204);
                assert.equal(res.body.message, 'No Content');
            });
        });
    });
    after(async () => {
        setTimeout(() => {
            process.emit('beforeExit');
        }, 100);
    });
});

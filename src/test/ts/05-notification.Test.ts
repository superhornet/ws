import { describe, it, suite, test, after } from "node:test";
import assert from "node:assert";
import { router as sessionRouter } from "../../main/ts/controllers/SessionController.ts";
import { router as userRouter } from "../../main/ts/controllers/UserController.ts";
import { router as notificationRouter } from "../../main/ts/controllers/NotificationController.ts";
import { findRouteHandler, mockGetRequest, mockSession, mockUser, mockNotification } from '../../main/ts/libs/mocks.ts'
import { SubscriptionType } from "../../main/ts/types/SubscriptionTypes.ts";

suite("Testing the Notification routes without session", () => {
    describe("Make a POST request to /api/notification endpoint", () => {
        it("Checks the failing paths for empty body", async () => {
            const handler = findRouteHandler(notificationRouter, 'post', '/notification');
            const { req, res } = mockNotification({});
            test("Handler is okay", () => {
                assert.ok(handler, "Missing handler for notification endpoint");
            });
            it("Act", async () => {
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
            });
            test("response is 400 Bad Request, if body has been omitted.", async () => {
                assert.equal(res.statusCode, 400);
                assert.equal(res.body.message, 'Empty JSON body');
            });
        });
        it("Checks the failing paths for missing session", async () => {
            const handler = findRouteHandler(notificationRouter, 'post', '/notification');
            const { req, res } = mockNotification({ body: { message: "Missing session" } });
            test("Handler is okay", () => {
                assert.ok(handler, "Missing handler for notification endpoint");
            });
            it("Act", async () => {
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
            });
            test("response is 403 Unauthorized, if session has been omitted.", async () => {
                assert.equal(res.statusCode, 403);
                assert.equal(res.body.message, 'Session ID Required');
            });
        });
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
                assert.equal(res.body.data.length, 2);
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
                assert.equal(res.body.message, 'No content');
            });
        });
    });
    after(async () => {
        setTimeout(() => {
            process.emit('beforeExit');
        }, 100);
    });
});

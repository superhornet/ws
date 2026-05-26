import { describe, test, after } from "node:test";
import assert from "node:assert";
import { router as sessionRouter } from "../../main/ts/controllers/SessionController.ts";
import { router as userRouter } from "../../main/ts/controllers/UserController.ts";
import { router as notificationRouter } from "../../main/ts/controllers/NotificationController.ts";
import { findRouteHandler, mockSession, mockUser, mockNotification } from '../../main/ts/libs/mocks.ts'
import { SubscriptionType } from "../../main/ts/types/SubscriptionTypes.ts";

let sharedSession: string = "";
let sharedUser: string = "";
let sharedNotification: string = "";
describe("Get a session", async () => {
    const handler = findRouteHandler(sessionRouter, 'get', '/session');
    assert.ok(handler, "Missing handler for session get");

    const { req, res } = mockSession();
    // @ts-expect-error req is fine as-is
    await handler(req, res, () => null);
    sharedSession = (res.body.data).uuid;
});
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
    sharedUser = res.body.data.user_identifier;
});
describe("Testing the /api/notification endpoint", () => {

    test("Error 400 response when missing body of POST method", async () => {
        const handler = findRouteHandler(notificationRouter, 'post', '/notification');
        assert.ok(handler, "Missing handler for notification endpoint");
        const { req, res } = mockNotification({});

        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Empty JSON body');
    });
    test("Error 403 response when missing session of POST method", async () => {
        const handler = findRouteHandler(notificationRouter, 'post', '/notification');
        assert.ok(handler, "Missing handler for notification endpoint");
        const { req, res } = mockNotification({ body: { message: "Test unauthorized response", session: "" } });

        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session ID Required');
    });
    test("Create a sample notification", async () => {
        const handler = findRouteHandler(notificationRouter, 'post', '/notification');
        assert.ok(handler, "Missing handler for notification endpoint");
        const { req, res } = mockNotification({
            body: {
                data: {
                    message: "Knowledge is half the battle.",
                    notification_for: sharedUser,
                },
                message: "Generated message",
                session: sharedSession,
            }
        });

        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 201);
        assert.equal(res.body.message, 'Created');
        sharedNotification = res.body.data.noification_for;
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
    test("List Notifications", async () => {
        const handler = findRouteHandler(notificationRouter, 'get', '/notifications');
        assert.ok(handler, "Missing handler for notification endpoint");
        const { req, res } = mockNotification({
            body: {
                data:{
                    message: "",
                    notification_for: sharedUser
                },
                message: "List notifications",
                session: sharedSession,
            }
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.message, 'OK');
        //assert.equal(res.body.data.length, 2);
    });
    test("Mark a notification as read", async () => {
        const handler = findRouteHandler(notificationRouter, 'put', '/notification/:id');
        assert.ok(handler, "Missing handler for notification endpoint");
        const { req, res } = mockNotification({
            params: {
                id: 1
            },
            body: {
                data: {
                    message: ""
                },
                message: "Update",
                session: sharedSession,
                note_identifier: sharedNotification
            }
        });

        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 202);
        assert.equal(res.body.message, 'Accepted');
    });
    test("Delete a notification", async () => {
        const handler = findRouteHandler(notificationRouter, 'delete', '/notification/:id');
        assert.ok(handler, "Missing handler for notification endpoint");
        const { req, res } = mockNotification({
            params: {
                id: 2
            },
            body: {
                data: {
                    message: ""
                },
                message: "Delete",
                session: sharedSession,
                note_identifier: ""
            }
        });

        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 204);
        assert.equal(res.body.message, 'No Content');
    });
});
after(() => {
    console.log("Tests complete");
    process.emit('beforeExit');
});

import { after, describe, it, suite, test } from "node:test";
import assert from "node:assert";
import { router as sessionRouter } from "../../main/ts/controllers/SessionController.ts";
import { router as userRouter } from "../../main/ts/controllers/UserController.ts";
import { router as stackRouter } from "../../main/ts/controllers/StackController.ts";
import { router as substackRouter } from "../../main/ts/controllers/SubstackController.ts";
import { findRouteHandler, mockGetRequest, mockSession, mockUser, mockStack, mockSubStack } from "../../main/ts/libs/mocks.ts";
import { SubscriptionType } from "../../main/ts/types/SubscriptionTypes.ts";
import { SubStackQueryTypes } from "../../main/ts/types/SubStackAPITypes.ts";

suite("Testing the SubStack routes without session", () => {
    describe("Make a POST request to /api/substack endpoint", () => {
        it("Checks the failing path for empty body", async () => {
            const handler = findRouteHandler(substackRouter, 'post', '/substack');
            const { req, res } = mockSubStack({});
            test("Handler is okay", () => {
                assert.ok(handler, "Missing handler for substack endpoint");
            });
            it("Act", async () => {
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
            });
            test("response is 400 Bad Request", () => {
                assert.equal(res.statusCode, 400);
                assert.equal(res.body.message, 'Empty JSON Body');
            });
        });
        it("Checks the failing paths for missing session", async () => {
            const handler = findRouteHandler(substackRouter, 'post', '/substack');
            const { req, res } = mockSubStack({ body: { message: "Missing session" } });
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
suite("Testing the SubStack routes with session", () => {
    describe("Get a session", async () => {
        const handler = findRouteHandler(sessionRouter, 'get', '/session');
        assert.ok(handler, "Missing handler for session post");

        const { req, res } = mockSession();
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        const sharedSession = res.body.data.uuid;
        let sharedUser: string;
        it("Create a user", async () => {
            const handler = findRouteHandler(userRouter, 'post', '/user');
            assert.ok(handler, "Missing handler for user post");

            const { req, res } = mockUser({
                body: {
                    data: {
                        firstname: "Admin",
                        lastname: "WeStack",
                        email: "admin@westack.cash",
                        address1: "123 Any St",
                        address2: "",
                        city: "Tampa",
                        state: "FL",
                        zipcode: "12345",
                        subscription_level: SubscriptionType.PRO
                    },
                    message: "Admin User",
                    session: sharedSession,
                }
            });
            // @ts-expect-error req is fine as-is
            await handler(req, res, null);
            assert.equal(res.statusCode, 201);
            assert.equal(res.body.message, 'Created');
            const adminUser = res.body.data.user_identifier;
            test("Admin User is returned", () => {
                assert.notEqual(null, adminUser);
                sharedUser = adminUser;
            });
        });
        it("Create a stack", async () => {
            const handler = findRouteHandler(stackRouter, 'post', '/stack');
            assert.ok(handler, "Missing handler for stack endpoint");
            const { req, res } = mockStack({
                body: {
                    data: {
                        stack_name: "Company",
                        stack_identifier: "",
                        owner_identifier: sharedUser
                    },
                    message: "Company Stack",
                    session: sharedSession,
                }
            });
            // @ts-expect-error req is fine as-is
            await handler(req, res, null);
            test("Check that it was successfully created", () => {
                assert.equal(res.statusCode, 201);
                assert.equal(res.body.message, 'Created');
            });
            test("Check that the Company stack was returned", () => {
                assert.equal(res.body.data.stack_name, "Company");
            });
            test("Company Stack ID is not null", () => {
                assert.notStrictEqual(null, res.body.data.stack_identifier);
            });
            const sharedStack = res.body.data.stack_identifier;
            let sharedSubStack: string;
            it("Create a substack", async () => {
                const handler = findRouteHandler(substackRouter, 'post', '/substack');
                assert.ok(handler, "Missing handler for substack endpoint");
                const { req, res } = mockSubStack({
                    body: {
                        data: {
                            substack_name: "Company Funds",
                            stack_identifier: sharedStack,
                            substack_identifier: "",
                            users_list: [],
                            balance: 0
                        },
                        message: "Company Funds Substack",
                        session: sharedSession,
                    }
                });
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                test("Check that it was successfully created", () => {
                    assert.equal(res.statusCode, 201);
                    assert.equal(res.body.message, 'Created');
                });
                test("Check that the Company Funds substack was returned", () => {
                    assert.equal(res.body.data.substack_name, "Company Funds");
                });
                test("Company Funds Substack ID is not null", { skip: false }, () => {
                    assert.notStrictEqual(null, res.body.data.substack_identifier);
                });
            });
            it("Create another substack", async () => {
                const handler = findRouteHandler(substackRouter, 'post', '/substack');
                assert.ok(handler, "Missing handler for substack endpoint");
                const { req, res } = mockSubStack({
                    body: {
                        data: {
                            substack_name: "Air Conditioner",
                            stack_identifier: sharedStack,
                            substack_identifier: "",
                            users_list: [],
                            balance: 0
                        },
                        message: "Air conditioner Stack",
                        session: sharedSession,
                    }
                });
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                test("Check that it was successfully created", () => {
                    assert.equal(res.statusCode, 201);
                    assert.equal(res.body.message, 'Created');
                });
                test("Check that the Company Funds substack was returned", () => {
                    assert.equal(res.body.data.substack_name, "Air Conditioner");
                });
                test("Company Funds Substack ID is not null", { skip: false }, () => {
                    assert.notStrictEqual(null, res.body.data.substack_identifier);
                });
                sharedSubStack = res.body.data.substack_identifier;
            });
            test("List Substacks by Stack ID", async () => {
                const handler = findRouteHandler(substackRouter, 'get', '/substacks');
                assert.ok(handler, "Missing handler for substack endpoint");
                const { req, res } = mockGetRequest({
                    headers: { "x-session": sharedSession },
                    query: {
                        type: SubStackQueryTypes.STACKID,
                        stack_identifier: sharedStack,
                        message: "List substacks",
                    },
                });

                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                test("That results were successfully retrieved", () => {
                    assert.equal(res.statusCode, 200);
                    assert.equal(res.body.message, 'OK');
                });
                test("That two results were retrieved", () => {
                    assert.equal(res.body.data.length, 2);
                });
            });
            test("List Substacks by Owner ID", async () => {
                const handler = findRouteHandler(substackRouter, 'get', '/substacks');
                assert.ok(handler, "Missing handler for substack endpoint");
                const { req, res } = mockGetRequest({
                    headers: { "x-session": sharedSession },
                    query: {
                        type: SubStackQueryTypes.OWNERID,
                        owner_identifier: sharedUser,
                        message: "List substacks",
                    },
                });

                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                test("That results were successfully retrieved", () => {
                    assert.equal(res.statusCode, 200);
                    assert.equal(res.body.message, 'OK');
                });
                test("That two results were retrieved", () => {
                    assert.equal(res.body.data.length, 2);
                });
            });
            test("List Substacks by Substack Name", async () => {
                const handler = findRouteHandler(substackRouter, 'get', '/substacks');
                assert.ok(handler, "Missing handler for substack endpoint");
                const { req, res } = mockGetRequest({
                    headers: { "x-session": sharedSession },
                    query: {
                        type: SubStackQueryTypes.SUBSTACKNAME,
                        substack_name: "Air Conditioner",
                        message: "List substacks",
                    },
                });

                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                test("That results were successfully retrieved", () => {
                    assert.equal(res.statusCode, 200);
                    assert.equal(res.body.message, 'OK');
                });
                test("That one result is retrieved", () => {
                    assert.notEqual(res.body.data.length, 0);
                });
            });
            test("Rename Substack", async () => {
                const handler = findRouteHandler(substackRouter, 'put', '/substack');
                assert.ok(handler, "Missing handler for substack endpoint");
                const { req, res } = mockSubStack({
                    body: {
                        data: {
                            substack_name: "Heat Pump",
                            stack_identifier: "",
                            substack_identifier: sharedSubStack,
                            users_list: ['019e79e7-e656-794d-a5f1-dc999d6c9c77', sharedUser],
                            balance: 0,
                        },
                        message: "Rename substack",
                        session: sharedSession,
                    }
                });

                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                test("That result is 202 Accepted", () => {
                    assert.equal(res.statusCode, 202);
                    assert.equal(res.body.message, 'Accepted');
                });
                test("That data is not returned", () => {
                    assert.equal(null, res.body.data);
                });
            });
            test("Delete a substack", async () => {
                const handler = findRouteHandler(substackRouter, 'delete', '/substack');
                assert.ok(handler, "Missing handler for substack endpoint");
                const { req, res } = mockSubStack({
                    body: {
                        data: {
                            substack_name: "",
                            stack_identifier: "",
                            substack_identifier: sharedSubStack,
                            users_list: [],
                            balance: 0,
                        },
                        message: "Delete substack",
                        session: sharedSession,
                    }
                });
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                test("That result is 204 No content", () => {
                    assert.equal(res.statusCode, 204);
                    assert.equal(res.body.message, 'No content');
                });
                test("That data is not returned", () => {
                    assert.equal(null, res.body.data);
                });
            });
        });
    });

    after(async () => {
        setTimeout(() => {
            process.emit('beforeExit');
        }, 100);
    });
});

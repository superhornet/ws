import { after, describe, it, suite, test } from "node:test";
import assert from "node:assert";
import { router as sessionRouter } from "../../main/ts/controllers/SessionController.ts";
import { router as userRouter } from "../../main/ts/controllers/UserController.ts";
import { router as stackRouter } from "../../main/ts/controllers/StackController.ts";
import { findRouteHandler, mockGetRequest, mockSession, mockUser, mockStack } from "../../main/ts/libs/mocks.ts";
import { SubscriptionType } from "../../main/ts/types/SubscriptionTypes.ts";

let sharedSession: string = "";
let sharedUser: string = "";
let sharedStack: string = "";
suite("Session Creation", { skip: false }, async () => {
    it("Get a session", async () => {
        const handler = findRouteHandler(sessionRouter, 'get', '/session');
        assert.ok(handler, "Missing handler for session get");

        const { req, res } = mockSession();
        // @ts-expect-error req is fine as-is
        await handler(req, res, () => null);
        sharedSession = (res.body.data).uuid;
        test("and session is a uuid", () => {
            assert.strictEqual(36, sharedSession.length);
        });
    });
    it("Creates a user", async () => {
        const handler = findRouteHandler(userRouter, 'post', '/user');
        assert.ok(handler, "Missing handler for user post");

        const { req, res } = mockUser({
            body: {
                data: {
                    firstname: "Alyssa",
                    lastname: "Milano",
                    email: "amboogie@gmail.com",
                    address1: "12 Charmed House Lane",
                    address2: "",
                    city: "San Francisco",
                    state: "CA",
                    zipcode: "94119",
                    subscription_level: SubscriptionType.PRO
                },
                message: "We have a witch",
                session: sharedSession,
            }
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        sharedUser = res.body.data.user_identifier;
        test("And creation is successful", () => {
            after(() => console.log('User creation success'));
            assert.equal(res.statusCode, 201);
            assert.equal(res.body.message, 'Created');
        });
        test("And User is returned", () => {
            assert.notEqual(null, sharedUser);
        });
    });
});
suite("Endpoint Tests", () => {
    describe("Tests the POST /api/stack endpoint", () => {
        it("Checks for failure conditions.", () => {
            test("Expects 400 response when missing body of POST method", async () => {
                const handler = findRouteHandler(stackRouter, 'post', '/stack');
                assert.ok(handler, "Missing handler for stack endpoint");
                const { req, res } = mockStack({});

                // @ts-expect-error req is fine as-is
                handler(req, res, null);
                assert.equal(res.statusCode, 400);
                assert.equal(res.body.message, 'Empty JSON body');
            });
            test("Error 403 response when missing session of POST method", async () => {
                const handler = findRouteHandler(stackRouter, 'post', '/stack');
                assert.ok(handler, "Missing handler for stack endpoint");
                const { req, res } = mockStack({
                    body: {
                        message: "Test unauthorized response",
                        session: ""
                    }
                });

                // @ts-expect-error req is fine as-is
                handler(req, res, null);
                assert.equal(res.statusCode, 403);
                assert.equal(res.body.message, 'Session ID Required');
            });
        });
        it("Should succeed at", () => {
            it("Creating a sample stack", async () => {
                const handler = findRouteHandler(stackRouter, 'post', '/stack');
                assert.ok(handler, "Missing handler for stack endpoint");
                const { req, res } = mockStack({
                    body: {
                        data: {
                            stack_name: "Vacation",
                            stack_identifier: "",
                            owner_identifier: sharedUser
                        },
                        message: "Sample Stack",
                        session: sharedSession,
                    }
                });
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                test("Check that it was successfully created", () => {
                    assert.equal(res.statusCode, 201);
                    assert.equal(res.body.message, 'Created');
                });
            });
            it("Creating another sample stack", async () => {
                const handler = findRouteHandler(stackRouter, 'post', '/stack');
                assert.ok(handler, "Missing handler for stack endpoint");
                const { req, res } = mockStack({
                    body: {
                        data: {
                            stack_name: "Tools",
                            stack_identifier: "",
                            owner_identifier: sharedUser
                        },
                        message: "Another Sample Stack",
                        session: sharedSession
                    }
                });

                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                test("Check that it was successfully created", () => {
                    assert.equal(res.statusCode, 201);
                    assert.equal(res.body.message, 'Created');
                });
                sharedStack = res.body.data.stack_identifier;
            });
            it("Creates a Company Stack", () => {
                it("Will be named Company", async () => {
                    const handler = findRouteHandler(stackRouter, 'post', '/stack');
                    assert.ok(handler, "Missing handler for stack endpoint");
                    const { req, res } = mockStack({
                        body: {
                            data: {
                                stack_name: "Company",
                                stack_identifier: "",
                                owner_identifier: sharedUser
                            },
                            session: sharedSession,
                            message: "Company stack"
                        }
                    });

                    // @ts-expect-error req is fine as-is
                    await handler(req, res, null);
                    test("Check that it was successfully created", () => {
                        assert.equal(res.statusCode, 201);
                        assert.equal(res.body.message, 'Created');
                    });
                    assert.equal("Company", res.body.data.stack_name);
                });
            });
        });
    });


    describe("Tests the GET /api/stacks endpoint", () => {
        it("List Stacks", async () => {
            const handler = findRouteHandler(stackRouter, 'get', '/stacks');
            assert.ok(handler, "Missing handler for stack endpoint");
            const { req, res } = mockGetRequest({
                headers: { "x-session": sharedSession },
                query: {
                    owner_identifier: sharedUser,
                    message: "List Stacks",
                },
            });

            // @ts-expect-error req is fine as-is
            await handler(req, res, null);
            it("Tests for correct results", () => {
                assert.equal(res.statusCode, 200);
                assert.equal(res.body.message, 'OK');
                assert.equal(Object.keys(res.body.data).length, 3);
            });
        });
    });
    describe("Tests the PUT /api/stack endpoint", () => {
        test("Rename a stack", async () => {
            const handler = findRouteHandler(stackRouter, 'put', '/stack');
            assert.ok(handler, "Missing handler for stack endpoint");
            const { req, res } = mockStack({
                body: {
                    data: {
                        stack_name: "Appliances",
                        stack_identifier: sharedStack,
                        owner_identifier: ""
                    },
                    session: sharedSession,
                    message: "Rename a stack"
                }
            });

            // @ts-expect-error req is fine as-is
            await handler(req, res, null);
            assert.equal(res.statusCode, 202);
            assert.equal(res.body.message, 'Accepted');
            sharedStack = req?.body?.data?.stack_identifier || "";
        });
    });


    describe("Tests the DELETE /api/stack endpoint", () => {
        test("Delete a stack", async () => {
            const handler = findRouteHandler(stackRouter, 'delete', '/stack');
            assert.ok(handler, "Missing handler for stack endpoint");
            const { req, res } = mockStack({
                body: {
                    data: {
                        stack_name: "",
                        stack_identifier: sharedStack,
                        owner_identifier: ""
                    },
                    session: sharedSession,
                    message: "Delete a stack"
                }
            });

            // @ts-expect-error req is fine as-is
            await handler(req, res, null);
            assert.equal(res.statusCode, 204);
            assert.equal(res.body.message, 'No content');
        });
    });
});
after( () => {
    console.log("Tests complete");
    process.emit('beforeExit');
});

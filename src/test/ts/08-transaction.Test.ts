import { after, describe, it, suite, test } from "node:test";
import assert from "node:assert";
import { router as sessionRouter } from "../../main/ts/controllers/SessionController.ts";
import { router as userRouter } from "../../main/ts/controllers/UserController.ts";
import { router as stackRouter } from "../../main/ts/controllers/StackController.ts";
import { router as substackRouter } from "../../main/ts/controllers/SubstackController.ts";
import { router as transactionRouter } from "../../main/ts/controllers/TransactionController.ts";
import { findRouteHandler, mockGetRequest, mockSession, mockUser, mockStack, mockSubStack, mockTransaction } from "./mocks.ts";
import { TransactionItemType, TransactionProcessorType, TransactionQueryTypes } from "../../main/ts/types/TransactionAPITypes.ts";
import { SubscriptionType } from "../../main/ts/types/SubscriptionTypes.ts";
// import { TransactionItemType, TransactionProcessorType } from "../../main/ts/types/TransactionAPITypes.ts";

suite("Testing the Transaction routes without session", { skip: false }, () => {
    describe("Make a POST request to /api/transaction endpoint", () => {
        it("Checks the failing path for empty body", () => {
            const handler = findRouteHandler(transactionRouter, 'post', '/transaction');
            const { req, res } = mockTransaction({});
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
            const handler = findRouteHandler(transactionRouter, 'post', '/transaction');
            // Supply a well-formed body (so the 400 body-shape check passes) but no
            // session, to exercise the 403 missing-session path in authorize().
            const { req, res } = mockTransaction({
                body: {
                    data: {
                        initiated_by: "",
                        notation: "Missing session",
                        from_identifier: "00000000-0000-0000-0000-000000000000",
                        to_identifier: "11111111-1111-1111-1111-111111111111",
                        amount: 1,
                        processor: TransactionProcessorType.INTERNAL,
                        transaction_type: TransactionItemType.INITIAL_FUND
                    },
                    message: "Missing session",
                }
            });
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
suite("Testing the Transaction routes with session", () => {
    let sharedUser: string, superUser: string;
    let companyStack: string;
    // Hoisted so the ownership-scoped reads of the company stack / admin user
    // below run on the session bound to their owner (admin).
    let firstSession: string;
    describe("Get a session", async () => {
        const handler = findRouteHandler(sessionRouter, 'get', '/session');
        assert.ok(handler, "Missing handler for session post");

        const { req, res } = mockSession();
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        firstSession = res.body.data.uuid;
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
                    session: firstSession,
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
                superUser = adminUser;
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
                    session: firstSession,
                }
            });
            // @ts-expect-error req is fine as-is
            await handler(req, res, null);
            test("Check that it was successfully created", () => {
                assert.equal(res.statusCode, 201);
                assert.equal(res.body.message, 'Created');
            });
            const sharedStack = res.body.data.stack_identifier;
            companyStack = sharedStack;
            let companySubStack: string, companyUnstacked: string;
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
                        session: firstSession,
                    }
                });
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                test("Check that it was successfully created", () => {
                    assert.equal(res.statusCode, 201);
                    assert.equal(res.body.message, 'Created');
                });
                companySubStack = res.body.data.substack_identifier;
            });
            it("Create an Unstacked substack", async () => {
                const handler = findRouteHandler(substackRouter, 'post', '/substack');
                assert.ok(handler, "Missing handler for substack endpoint");
                const { req, res } = mockSubStack({
                    body: {
                        data: {
                            substack_name: "Unstacked",
                            stack_identifier: sharedStack,
                            substack_identifier: "",
                            users_list: [],
                            balance: 420000
                        },
                        message: "Unstacked Funds Substack",
                        session: firstSession,
                    }
                });
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                test("Check that it was successfully created", () => {
                    assert.equal(res.statusCode, 201);
                    assert.equal(res.body.message, 'Created');
                });
                companyUnstacked = res.body.data.substack_identifier;
            });
            it("Transfer $7.42 from Unstacked to Company Stack", async () => {
                const handler = findRouteHandler(transactionRouter, 'post', '/transaction');
                assert.ok(handler, "Missing handler for substack endpoint");
                const { req, res } = mockTransaction({
                    body: {
                        data: {
                            initiated_by: sharedUser,
                            notation: "Fund company $7.42",
                            from_identifier: companyUnstacked,
                            to_identifier: companySubStack,
                            amount: 7.42,
                            processor: TransactionProcessorType.INTERNAL,
                            transaction_type: TransactionItemType.INITIAL_FUND
                        },
                        message: "Transferring $7.42",
                        session: firstSession,
                    }
                });
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                test("Check that it was successfully created", () => {
                    assert.equal(res.statusCode, 201);
                    assert.equal(res.body.message, 'Created');
                });
            });
        });
    });
    describe("Get a session", async () => {
        const handler = findRouteHandler(sessionRouter, 'get', '/session');
        assert.ok(handler, "Missing handler for session post");

        const { req, res } = mockSession();
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        const secondSession = res.body.data.uuid;
        let sharedUser: string;
        it("Create a user", async () => {
            const handler = findRouteHandler(userRouter, 'post', '/user');
            assert.ok(handler, "Missing handler for user post");

            const { req, res } = mockUser({
                body: {
                    data: {
                        firstname: "Clifford",
                        lastname: "Smith",
                        email: "methodman@wutang.com",
                        address1: "160 Park Hill Ave",
                        address2: "",
                        city: "Staten Island",
                        state: "NY",
                        zipcode: "10304",
                        subscription_level: SubscriptionType.PRO
                    },
                    message: "Another User",
                    session: secondSession,
                }
            });
            // @ts-expect-error req is fine as-is
            await handler(req, res, null);
            assert.equal(res.statusCode, 201);
            assert.equal(res.body.message, 'Created');
            sharedUser = res.body.data.user_identifier;
            test("User is returned", () => {
                assert.notEqual(null, sharedUser);
            });
        });
        it("Create a stack", async () => {
            const handler = findRouteHandler(stackRouter, 'post', '/stack');
            assert.ok(handler, "Missing handler for stack endpoint");
            const { req, res } = mockStack({
                body: {
                    data: {
                        stack_name: "Appliances",
                        stack_identifier: "",
                        owner_identifier: sharedUser
                    },
                    message: "Appliances Stack",
                    session: secondSession,
                }
            });
            // @ts-expect-error req is fine as-is
            await handler(req, res, null);
            test("Check that it was successfully created", () => {
                assert.equal(res.statusCode, 201);
                assert.equal(res.body.message, 'Created');
            });
            const sharedStack = res.body.data.stack_identifier;
            let cottonCandySubStack: string, appliancesUnstacked: string, flatscreenTVSubstack: string;
            it("Create a substack for cotton candy machine", async () => {
                const handler = findRouteHandler(substackRouter, 'post', '/substack');
                assert.ok(handler, "Missing handler for substack endpoint");
                const { req, res } = mockSubStack({
                    body: {
                        data: {
                            substack_name: "Cotton Candy Machine",
                            stack_identifier: sharedStack,
                            substack_identifier: "",
                            users_list: [],
                            balance: 0
                        },
                        message: "Cotton Candy Substack",
                        session: secondSession,
                    }
                });
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                test("Check that it was successfully created", () => {
                    assert.equal(res.statusCode, 201);
                    assert.equal(res.body.message, 'Created');
                });
                cottonCandySubStack = res.body.data.substack_identifier;
            });
            it("Create an Unstacked substack", async () => {
                const handler = findRouteHandler(substackRouter, 'post', '/substack');
                assert.ok(handler, "Missing handler for substack endpoint");
                const { req, res } = mockSubStack({
                    body: {
                        data: {
                            substack_name: "Unstacked",
                            stack_identifier: sharedStack,
                            substack_identifier: "",
                            users_list: [],
                            balance: 500000
                        },
                        message: "Unstacked Funds Substack",
                        session: secondSession,
                    }
                });
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                test("Check that it was successfully created", () => {
                    assert.equal(res.statusCode, 201);
                    assert.equal(res.body.message, 'Created');
                });
                appliancesUnstacked = res.body.data.substack_identifier;
            });
            it("Create an Flatscreen TV substack", async () => {
                const handler = findRouteHandler(substackRouter, 'post', '/substack');
                assert.ok(handler, "Missing handler for substack endpoint");
                const { req, res } = mockSubStack({
                    body: {
                        data: {
                            substack_name: "Flatscreen TV",
                            stack_identifier: sharedStack,
                            substack_identifier: "",
                            users_list: [],
                            balance: 0
                        },
                        message: "Flatscreen TV Substack",
                        session: secondSession,
                    }
                });
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                test("Check that it was successfully created", () => {
                    assert.equal(res.statusCode, 201);
                    assert.equal(res.body.message, 'Created');
                });
                flatscreenTVSubstack = res.body.data.substack_identifier;
            });
            it("Transfer $84.80 from Unstacked to Flat Screen TV Substack", async () => {
                const handler = findRouteHandler(transactionRouter, 'post', '/transaction');
                assert.ok(handler, "Missing handler for substack endpoint");
                const { req, res } = mockTransaction({
                    body: {
                        data: {
                            initiated_by: sharedUser,
                            notation: "Fund TV $84.80",
                            from_identifier: appliancesUnstacked,
                            to_identifier: flatscreenTVSubstack,
                            amount: 84.8,
                            processor: TransactionProcessorType.INTERNAL,
                            transaction_type: TransactionItemType.INITIAL_FUND
                        },
                        message: "Transferring $84.80",
                        session: secondSession,
                    }
                });
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                test("Check that it was successfully created", () => {
                    assert.equal(res.statusCode, 201);
                    assert.equal(res.body.message, 'Created');
                });
            });
            it("Transfer $50.00 from Unstacked to Cotton Candy Machine Substack", async () => {
                const handler = findRouteHandler(transactionRouter, 'post', '/transaction');
                assert.ok(handler, "Missing handler for substack endpoint");
                const { req, res } = mockTransaction({
                    body: {
                        data: {
                            initiated_by: sharedUser,
                            notation: "Fund Cotton Candy Machine $50.00",
                            from_identifier: appliancesUnstacked,
                            to_identifier: cottonCandySubStack,
                            amount: 50,
                            processor: TransactionProcessorType.GOOGLE,
                            transaction_type: TransactionItemType.INITIAL_FUND
                        },
                        message: "Transferring $50.00",
                        session: secondSession,
                    }
                });
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                test("Check that it was successfully created", () => {
                    assert.equal(res.statusCode, 201);
                    assert.equal(res.body.message, 'Created');
                });
            });
            it("Transfer $9.15 from Cotton Candy Machine Substack to Unstacked", async () => {
                const handler = findRouteHandler(transactionRouter, 'post', '/transaction');
                assert.ok(handler, "Missing handler for substack endpoint");
                const { req, res } = mockTransaction({
                    body: {
                        data: {
                            initiated_by: sharedUser,
                            notation: "Transfer Unstacked $9.15",
                            from_identifier: cottonCandySubStack,
                            to_identifier: appliancesUnstacked,
                            amount: 9.15,
                            processor: TransactionProcessorType.INTERNAL,
                            transaction_type: TransactionItemType.INITIAL_FUND
                        },
                        message: "Transferring $9.15",
                        session: secondSession,
                    }
                });
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                test("Check that it was successfully created", () => {
                    assert.equal(res.statusCode, 201);
                    assert.equal(res.body.message, 'Created');
                });
            });
            it("Transfer $14.86 from Cotton Candy Machine Substack to Unstacked", async () => {
                const handler = findRouteHandler(transactionRouter, 'post', '/transaction');
                assert.ok(handler, "Missing handler for substack endpoint");
                const { req, res } = mockTransaction({
                    body: {
                        data: {
                            initiated_by: sharedUser,
                            notation: "Transfer Unstacked $14.86",
                            from_identifier: cottonCandySubStack,
                            to_identifier: appliancesUnstacked,
                            amount: 14.86,
                            processor: TransactionProcessorType.INTERNAL,
                            transaction_type: TransactionItemType.INITIAL_FUND
                        },
                        message: "Transferring $14.86",
                        session: secondSession,
                    }
                });
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                test("Check that it was successfully created", () => {
                    assert.equal(res.statusCode, 201);
                    assert.equal(res.body.message, 'Created');
                });
            });
            it("Fail to transfer $125.32 from Flat Screen TV Substack to Unstacked", async () => {
                const handler = findRouteHandler(transactionRouter, 'post', '/transaction');
                assert.ok(handler, "Missing handler for substack endpoint");
                const { req, res } = mockTransaction({
                    body: {
                        data: {
                            initiated_by: sharedUser,
                            notation: "Adjust $125.32 to Unstacked",
                            from_identifier: flatscreenTVSubstack,
                            to_identifier: appliancesUnstacked,
                            amount: 125.32,
                            processor: TransactionProcessorType.INTERNAL,
                            transaction_type: TransactionItemType.ADJUSTMENT
                        },
                        message: "Transferring $84.80",
                        session: secondSession,
                    }
                });
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                test("Check that it was unsuccessful", () => {
                    assert.equal(res.statusCode, 400);
                    assert.equal(res.body.message, 'Insufficient funds');
                });
            });
            it("List transactions for Company stack", async () => {
                test("Company stack is in scope", () => {
                    assert.notEqual(null, companyStack);
                });
                const handler = findRouteHandler(transactionRouter, 'get', '/transactions');
                assert.ok(handler, "Missing handler for transactions endpoint");
                const { req, res } = mockGetRequest({
                    headers: { "x-session": firstSession },
                    query: {
                        key: TransactionQueryTypes.STACK,
                        value: companyStack,
                        message: "Listing transactions by stack",
                    },
                });
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                test("Check that it was successful", () => {
                    assert.equal(res.statusCode, 200);
                    assert.equal((res.body.data as unknown[]).length, 3);
                });
            });
            it("List transactions for Cotton Candy Substack", async () => {
                test("cottonCandySubStack is in scope", () => {
                    assert.notEqual(null, cottonCandySubStack);
                });
                const handler = findRouteHandler(transactionRouter, 'get', '/transactions');
                assert.ok(handler, "Missing handler for transactions endpoint");
                const { req, res } = mockGetRequest({
                    headers: { "x-session": secondSession },
                    query: {
                        key: TransactionQueryTypes.SUBSTACK,
                        value: cottonCandySubStack,
                        message: "Listing transactions by substack",
                    },
                });
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                test("Check that it was successful", () => {
                    assert.equal(res.statusCode, 200);
                    assert.equal((res.body.data as unknown[]).length, 3);
                });
            });
        });
        it("List transactions for user", async () => {
            test("User is in scope", () => {
                assert.notEqual(null, sharedUser);
            });
            const handler = findRouteHandler(transactionRouter, 'get', '/transactions');
            assert.ok(handler, "Missing handler for transactions endpoint");
            const { req, res } = mockGetRequest({
                headers: { "x-session": firstSession },
                query: {
                    key: TransactionQueryTypes.USER,
                    value: superUser,
                    message: "Listing transactions by user",
                },
            });
            // @ts-expect-error req is fine as-is
            await handler(req, res, null);
            test("Check that it was successful", () => {
                assert.equal(res.statusCode, 200);
                assert.equal((res.body.data as unknown[]).length, 2);
            });
        });
    });
    after(async () => {
        setTimeout(() => {
            process.emit('beforeExit');
        }, 100);
    });
});

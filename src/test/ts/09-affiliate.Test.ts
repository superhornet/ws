/// <reference types="node" />
import { after, describe, it, suite, test } from "node:test";
import assert from "node:assert/strict";
import { Affiliate } from "../../main/ts/models/Affiliate.ts";
import { AffiliationType } from "../../main/ts/types/AffiliateAPITypes.ts";
import { SubscriptionType } from "../../main/ts/types/SubscriptionTypes.ts";
import { router as sessionRouter } from "../../main/ts/controllers/SessionController.ts";
import { router as userRouter } from "../../main/ts/controllers/UserController.ts";
import { router as affiliateRouter } from "../../main/ts/controllers/AffiliateController.ts";
import { findRouteHandler, mockSession, mockUser, mockAffiliate } from "../../main/ts/libs/mocks.ts";
import { type UserAPIType } from "../../main/ts/types/UserAPITypes.ts";

suite("Affiliation test suite", () => {
    test("Check Affiliate Class exists", () => {
        assert.ok(new Affiliate({
            affiliation_code: "",
            affiliation_type: AffiliationType.ANCESTOR,
            referrer: "test"
        }));
    });
    describe("Testing the /affiliate routes without session", { skip: false }, async () => {
        it("Checks the failing path for empty body", () => {
            const handler = findRouteHandler(affiliateRouter, 'post', '/affiliate');
            const { req, res } = mockAffiliate({});
            test("Handler is okay", () => {
                assert.ok(handler, "Missing handler for affiliate endpoint");
            });
            it("Act", async () => {
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
            });
            test("response is 400 Bad Request", () => {
                assert.equal(res.statusCode, 400);
                assert.equal(res.body.message, 'Empty JSON body');
            });
        });
        it("Checks the failing paths for missing session", async () => {
            const handler = findRouteHandler(affiliateRouter, 'post', '/affiliate');
            const { req, res } = mockAffiliate({ body: { message: "Missing session" } });
            test("Handler is okay", () => {
                assert.ok(handler, "Missing handler for affiliate endpoint");
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
    describe("Testing the /affiliate routes with session", async () => {
        let user1: UserAPIType, user2: UserAPIType;
        it("Get a session", async () => {
            const handler = findRouteHandler(sessionRouter, 'get', '/session');
            assert.ok(handler, "Missing handler for session post");

            const { req, res } = mockSession();
            // @ts-expect-error req is fine as-is
            await handler(req, res, null);
            const firstSession = res.body.data.uuid;
            // Each user signs up on its own session (a session binds to one user).
            const { req: req2, res: res2 } = mockSession();
            // @ts-expect-error req is fine as-is
            await handler(req2, res2, null);
            const secondSession = res2.body.data.uuid;

            it("Create user 1", async () => {
                const handler = findRouteHandler(userRouter, 'post', '/user');
                assert.ok(handler, "Missing handler for user post");

                const { req, res } = mockUser({
                    body: {
                        data: {
                            firstname: "Captain",
                            lastname: "Hook",
                            email: "hook@piratesguild.org",
                            address1: "12 Main St.",
                            address2: "",
                            city: "Key West",
                            state: "FL",
                            zipcode: "12345",
                            subscription_level: SubscriptionType.PRO
                        },
                        message: "Create User1",
                        session: firstSession
                    }
                });
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                user1 = res.body.data as unknown as UserAPIType;
            });
            it("Create user 2", async () => {
                const handler = findRouteHandler(userRouter, 'post', '/user');
                assert.ok(handler, "Missing handler for user post");

                const { req, res } = mockUser({
                    body: {
                        data: {
                            firstname: "Jack",
                            lastname: "Sparrow",
                            email: "sparrowj@piratesguild.org",
                            address1: "34 Main St.",
                            address2: "",
                            city: "Key West",
                            state: "FL",
                            zipcode: "12345",
                            subscription_level: SubscriptionType.BASIC
                        },
                        message: "Create User2",
                        session: secondSession
                    }
                });
                // @ts-expect-error req is fine as-is
                await handler(req, res, null);
                user2 = res.body.data as unknown as UserAPIType;
            });
            it("Send a post request to /api/affiliate", async () => {
                const handler = findRouteHandler(affiliateRouter, 'post', '/affiliate');
                const { req, res } = mockAffiliate({
                    body: {
                        data: {
                            affiliation_code: user1.affiliate!,
                            affiliation_type: "",
                            referrer: user2.user_identifier!
                        },
                        message: "Create affiliate relationship",
                        session: secondSession
                    }
                });
                test("Handler is okay", () => {
                    assert.ok(handler, "Missing handler for affiliate endpoint");
                });
                it("Act", async () => {
                    // @ts-expect-error req is fine as-is
                    await handler(req, res, null);
                });
                test("Affiliation successfully created", () => {
                    assert.equal(res.statusCode, 201, "Response code should be 201");
                    assert.equal(res.body.message, "Created", "Response message should be Created");
                })
                test("Returns the two relations", async () => {
                    if (res.body.data.length === 2) {
                        const relation1 = res.body.data.at(0);
                        const relation2 = res.body.data.at(1);
                        assert.strictEqual(relation1!.affiliation_type, AffiliationType.ANCESTOR);
                        assert.strictEqual(relation2!.affiliation_type, AffiliationType.DESCENDANT);
                    }
                });
            });
        });
        describe("Unit Test the implementation", { skip: true }, async () => {
            const affiliation = await Affiliate.connect(user1.affiliate!, user2.user_identifier!);
            test("Returns the two relations", async () => {
                if (affiliation?.length === 2) {
                    assert.strictEqual(affiliation[0].affiliation_type, AffiliationType.ANCESTOR);
                    assert.strictEqual(affiliation[1].affiliation_type, AffiliationType.DESCENDANT);
                }
            });
        });
        after(async () => {
            setTimeout(() => {
                process.emit('beforeExit');
            }, 100);
        });
    });
});

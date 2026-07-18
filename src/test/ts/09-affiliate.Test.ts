/// <reference types="node" />
import { after, suite, test } from "node:test";
import assert from "node:assert/strict";
import { Affiliate } from "../../main/ts/models/Affiliate.ts";
import { AffiliationType, type AffiliateAPIType } from "../../main/ts/types/AffiliateAPITypes.ts";
import { SubscriptionType } from "../../main/ts/types/SubscriptionTypes.ts";
import { router as sessionRouter } from "../../main/ts/controllers/SessionController.ts";
import { router as userRouter } from "../../main/ts/controllers/UserController.ts";
import { router as affiliateRouter } from "../../main/ts/controllers/AffiliateController.ts";
import { findRouteHandler, mockSession, mockUser, mockAffiliate } from "./mocks.ts";
import { type UserAPIType } from "../../main/ts/types/UserAPITypes.ts";

// Run-unique suffix so re-running against a persistent DB does not collide on
// the users' unique email constraint.
const RUN = Date.now();

async function createSession(): Promise<string> {
    const handler = findRouteHandler(sessionRouter, 'get', '/session');
    assert.ok(handler, "Missing handler for session get");
    const { req, res } = mockSession();
    // @ts-expect-error req is fine as-is
    await handler(req, res, null);
    return res.body.data.uuid;
}

/**
 * Signs up a fresh user on its own session (a session binds to one user) and
 * returns the session plus the created user, whose response carries both the
 * generated `affiliate` code and the `user_identifier` these tests act on.
 */
async function createBoundUser(label: string): Promise<{ session: string; user: UserAPIType }> {
    const session = await createSession();
    const handler = findRouteHandler(userRouter, 'post', '/user');
    assert.ok(handler, "Missing handler for user post");
    const { req, res } = mockUser({
        body: {
            data: {
                firstname: "Aff",
                lastname: "Tester",
                email: `${label}.${RUN}@piratesguild.org`,
                address1: "12 Main St.",
                address2: "",
                city: "Key West",
                state: "FL",
                zipcode: "12345",
                subscription_level: SubscriptionType.PRO,
            },
            message: `Signup ${label}`,
            session,
        },
    });
    // @ts-expect-error req is fine as-is
    await handler(req, res, null);
    assert.equal(res.statusCode, 201);
    return { session, user: res.body.data as unknown as UserAPIType };
}

async function postAffiliate(session: string | undefined, data: Partial<AffiliateAPIType>) {
    const handler = findRouteHandler(affiliateRouter, 'post', '/affiliate');
    assert.ok(handler, "Missing handler for affiliate endpoint");
    const { req, res } = mockAffiliate({
        body: {
            data: {
                affiliation_code: "",
                affiliation_type: "",
                referrer: "",
                ...data,
            },
            message: "Create affiliate relationship",
            ...(session !== undefined ? { session } : {}),
        },
    });
    // @ts-expect-error req is fine as-is
    await handler(req, res, null);
    return res;
}

suite("Affiliate: model construction", () => {
    test("Affiliate class constructs from an API shape", () => {
        assert.ok(new Affiliate({
            affiliation_code: "",
            affiliation_type: AffiliationType.ANCESTOR,
            referrer: "test",
        }));
    });
});

suite("Affiliate routes: input validation and missing session", () => {
    test("POST is 400 when the body is empty", async () => {
        const handler = findRouteHandler(affiliateRouter, 'post', '/affiliate');
        assert.ok(handler, "Missing handler for affiliate endpoint");
        const { req, res } = mockAffiliate({});
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Empty JSON body');
    });

    test("POST is 403 when the session is missing", async () => {
        const res = await postAffiliate(undefined, {
            affiliation_code: "ABCDEFG",
            referrer: "00000000-0000-0000-0000-000000000000",
        });
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session ID Required');
    });

    test("POST is 403 on a valid session with no user bound", async () => {
        const anonymousSession = await createSession();
        const res = await postAffiliate(anonymousSession, {
            affiliation_code: "ABCDEFG",
            referrer: "00000000-0000-0000-0000-000000000000",
        });
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session is not associated with a user');
    });
});

suite("Affiliate routes: authorization", () => {
    test("POST is 403 when the referrer is not the acting user", async () => {
        const ancestor = await createBoundUser("aff.authz.ancestor");
        const attacker = await createBoundUser("aff.authz.attacker");
        // The attacker acts on their own session but names a different user as the
        // referrer (descendant) — assertSelf must reject the forged referral.
        const res = await postAffiliate(attacker.session, {
            affiliation_code: ancestor.user.affiliate!,
            referrer: ancestor.user.user_identifier!,
        });
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Forbidden');
    });
});

suite("Affiliate routes: connect validation and lifecycle", () => {
    test("POST is 400 when the affiliate code is too short", async () => {
        const signer = await createBoundUser("aff.short.signer");
        const res = await postAffiliate(signer.session, {
            affiliation_code: "ABCDEF", // 6 chars, below the 7-char minimum
            referrer: signer.user.user_identifier!,
        });
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Code failed');
    });

    test("POST is 400 when the affiliate code is too long", async () => {
        const signer = await createBoundUser("aff.long.signer");
        const res = await postAffiliate(signer.session, {
            affiliation_code: "ABCDEFGHI", // 9 chars, above the 8-char maximum
            referrer: signer.user.user_identifier!,
        });
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Code failed');
    });

    test("POST is 400 when the affiliate code is empty", async () => {
        const signer = await createBoundUser("aff.emptycode.signer");
        const res = await postAffiliate(signer.session, {
            affiliation_code: "",
            referrer: signer.user.user_identifier!,
        });
        assert.equal(res.statusCode, 400);
        // The plan()-level guard rejects a missing/empty code before the model's
        // length validation ("Code failed") is reached.
        assert.equal(res.body.message, 'Affiliation code is required');
    });

    test("POST is 400 when the body has no data", async () => {
        const handler = findRouteHandler(affiliateRouter, 'post', '/affiliate');
        assert.ok(handler, "Missing handler for affiliate endpoint");
        const { req, res } = mockAffiliate({
            body: { message: "Malformed body", session: "not-checked" },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Affiliation code is required');
    });

    test("POST is 404 when the code is well-formed but unknown", async () => {
        const signer = await createBoundUser("aff.notfound.signer");
        const res = await postAffiliate(signer.session, {
            affiliation_code: "ZZZZZZZ", // 7 chars, valid shape, no such user
            referrer: signer.user.user_identifier!,
        });
        assert.equal(res.statusCode, 404);
        assert.equal(res.body.message, 'Affiliate code not found');
    });

    test("POST creates the ancestor/descendant pair with correct referrers", async () => {
        const ancestor = await createBoundUser("aff.happy.ancestor");
        const descendant = await createBoundUser("aff.happy.descendant");
        const res = await postAffiliate(descendant.session, {
            affiliation_code: ancestor.user.affiliate!,
            referrer: descendant.user.user_identifier!,
        });
        assert.equal(res.statusCode, 201);
        assert.equal(res.body.message, 'Created');

        const relations = res.body.data as unknown as AffiliateAPIType[];
        assert.equal(relations.length, 2, "Expected exactly two affiliation rows");

        const ancestorRow = relations.find((row) => row.affiliation_type === AffiliationType.ANCESTOR);
        const descendantRow = relations.find((row) => row.affiliation_type === AffiliationType.DESCENDANT);
        assert.ok(ancestorRow, "Missing ancestor relation");
        assert.ok(descendantRow, "Missing descendant relation");
        // The ancestor row points back to the code owner; the descendant row to
        // the signing user. Both carry the ancestor's affiliate code.
        assert.equal(ancestorRow?.referrer, ancestor.user.user_identifier);
        assert.equal(descendantRow?.referrer, descendant.user.user_identifier);
        assert.equal(ancestorRow?.affiliation_code, ancestor.user.affiliate);
        assert.equal(descendantRow?.affiliation_code, ancestor.user.affiliate);
    });

    test("POST ignores a client-supplied affiliation_type", async () => {
        const ancestor = await createBoundUser("aff.ignoretype.ancestor");
        const descendant = await createBoundUser("aff.ignoretype.descendant");
        const res = await postAffiliate(descendant.session, {
            affiliation_code: ancestor.user.affiliate!,
            affiliation_type: "Bogus", // must not leak through; server assigns types
            referrer: descendant.user.user_identifier!,
        });
        assert.equal(res.statusCode, 201);
        const types = (res.body.data as unknown as AffiliateAPIType[])
            .map((row) => row.affiliation_type)
            .sort();
        assert.deepEqual(types, [AffiliationType.ANCESTOR, AffiliationType.DESCENDANT].sort());
    });
});

suite("Affiliate routes: pinned current behavior", () => {
    // These pin behavior that is arguably wrong but currently permitted, so a
    // future change is a conscious decision rather than a silent regression.

    test("Self-referral is currently accepted (no self-loop guard)", async () => {
        // A user signing up with their own code links themselves as both ancestor
        // and descendant. This probably should be rejected; today it is not.
        const user = await createBoundUser("aff.self.user");
        const res = await postAffiliate(user.session, {
            affiliation_code: user.user.affiliate!,
            referrer: user.user.user_identifier!,
        });
        assert.equal(res.statusCode, 201);
        const relations = res.body.data as unknown as AffiliateAPIType[];
        assert.equal(relations.length, 2);
        for (const row of relations) {
            assert.equal(row.referrer, user.user.user_identifier);
        }
    });

    test("Duplicate affiliations are currently accepted (no uniqueness constraint)", async () => {
        const ancestor = await createBoundUser("aff.dup.ancestor");
        const descendant = await createBoundUser("aff.dup.descendant");
        const first = await postAffiliate(descendant.session, {
            affiliation_code: ancestor.user.affiliate!,
            referrer: descendant.user.user_identifier!,
        });
        assert.equal(first.statusCode, 201);
        // Re-posting the same pair inserts a second identical set of rows.
        const second = await postAffiliate(descendant.session, {
            affiliation_code: ancestor.user.affiliate!,
            referrer: descendant.user.user_identifier!,
        });
        assert.equal(second.statusCode, 201);
        assert.equal((second.body.data as unknown[]).length, 2);
    });
});

after(async () => {
    // Defer the pool-closing beforeExit so the final suite's last test has
    // settled before shutdown; emitting it synchronously races the last test.
    await new Promise((resolve) => setTimeout(resolve, 250));
    process.emit('beforeExit');
});

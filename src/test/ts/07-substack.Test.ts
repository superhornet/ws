import { after, suite, test } from "node:test";
import assert from "node:assert";
import { router as sessionRouter } from "../../main/ts/controllers/SessionController.ts";
import { router as userRouter } from "../../main/ts/controllers/UserController.ts";
import { router as stackRouter } from "../../main/ts/controllers/StackController.ts";
import { router as substackRouter } from "../../main/ts/controllers/SubstackController.ts";
import { findRouteHandler, mockGetRequest, mockSession, mockUser, mockStack, mockSubStack } from "./mocks.ts";
import { SubscriptionType } from "../../main/ts/types/SubscriptionTypes.ts";
import { SubStackQueryTypes, type SubStackAPIType } from "../../main/ts/types/SubStackAPITypes.ts";
import type { StackAPIType } from "../../main/ts/types/StackAPITypes.ts";

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
                firstname: "Sub",
                lastname: "Owner",
                email,
                address1: "1 Test St",
                address2: "",
                city: "Testville",
                state: "FL",
                zipcode: "33101",
                subscription_level: SubscriptionType.PRO,
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

async function createStack(session: string, name: string): Promise<StackAPIType> {
    const handler = findRouteHandler(stackRouter, 'post', '/stack');
    assert.ok(handler, "Missing handler for stack endpoint");
    const { req, res } = mockStack({
        body: {
            data: { stack_name: name, stack_identifier: "", owner_identifier: "" },
            message: `Create ${name}`,
            session,
        },
    });
    // @ts-expect-error req is fine as-is
    await handler(req, res, null);
    assert.equal(res.statusCode, 201);
    return res.body.data as unknown as StackAPIType;
}

async function createSubstack(session: string, stack_identifier: string, name: string, extra: Partial<SubStackAPIType> = {}): Promise<SubStackAPIType> {
    const handler = findRouteHandler(substackRouter, 'post', '/substack');
    assert.ok(handler, "Missing handler for substack endpoint");
    const { req, res } = mockSubStack({
        body: {
            data: {
                substack_name: name,
                stack_identifier,
                substack_identifier: "",
                users_list: [],
                balance: 0,
                ...extra,
            },
            message: `Create ${name}`,
            session,
        },
    });
    // @ts-expect-error req is fine as-is
    await handler(req, res, null);
    assert.equal(res.statusCode, 201);
    return res.body.data as unknown as SubStackAPIType;
}

/**
 * Owner-driven update that overwrites a substack's members. `renameSubstack`
 * persists `users_list` verbatim, so this is how a member gets added.
 */
async function setSubstackMembers(session: string, substack: SubStackAPIType, members: string[]): Promise<void> {
    const handler = findRouteHandler(substackRouter, 'put', '/substack');
    assert.ok(handler, "Missing handler for substack endpoint");
    const { req, res } = mockSubStack({
        body: {
            data: {
                substack_name: substack.substack_name,
                stack_identifier: "",
                substack_identifier: substack.substack_identifier,
                users_list: members,
                balance: 0,
            },
            message: "Set members",
            session,
        },
    });
    // @ts-expect-error req is fine as-is
    await handler(req, res, null);
    assert.equal(res.statusCode, 202);
}

async function listByStack(session: string, stack_identifier: string) {
    const handler = findRouteHandler(substackRouter, 'get', '/substacks');
    assert.ok(handler, "Missing handler for substack endpoint");
    const { req, res } = mockGetRequest({
        headers: { "x-session": session },
        query: { type: SubStackQueryTypes.STACKID, stack_identifier },
    });
    // @ts-expect-error req is fine as-is
    await handler(req, res, null);
    return res;
}

suite("SubStack routes: input validation and missing session", () => {
    test("POST is 400 when the body is empty", async () => {
        const handler = findRouteHandler(substackRouter, 'post', '/substack');
        assert.ok(handler, "Missing handler for substack endpoint");
        const { req, res } = mockSubStack({});
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Empty JSON Body');
    });

    test("POST is 403 when the session is missing", async () => {
        const handler = findRouteHandler(substackRouter, 'post', '/substack');
        assert.ok(handler, "Missing handler for substack endpoint");
        const { req, res } = mockSubStack({
            body: {
                data: { substack_name: "No Session Sub", stack_identifier: "00000000-0000-0000-0000-000000000000", substack_identifier: "", users_list: [], balance: 0 },
                message: "Missing session",
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session ID Required');
    });

    test("POST is 400 when the body has no data", async () => {
        const handler = findRouteHandler(substackRouter, 'post', '/substack');
        assert.ok(handler, "Missing handler for substack endpoint");
        const { req, res } = mockSubStack({
            body: { message: "Malformed body", session: "not-checked" },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Stack identifier is required');
    });

    test("PUT is 400 when the body is empty", async () => {
        const handler = findRouteHandler(substackRouter, 'put', '/substack');
        assert.ok(handler, "Missing handler for substack endpoint");
        const { req, res } = mockSubStack({});
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Empty JSON Body');
    });

    test("PUT is 403 when the session is missing", async () => {
        const handler = findRouteHandler(substackRouter, 'put', '/substack');
        assert.ok(handler, "Missing handler for substack endpoint");
        const { req, res } = mockSubStack({
            body: {
                data: { substack_name: "Renamed", stack_identifier: "", substack_identifier: "00000000-0000-0000-0000-000000000000", users_list: [], balance: 0 },
                message: "No session",
                session: "",
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session ID Required');
    });

    test("PUT is 400 when the body has no data", async () => {
        const handler = findRouteHandler(substackRouter, 'put', '/substack');
        assert.ok(handler, "Missing handler for substack endpoint");
        const { req, res } = mockSubStack({
            body: { message: "Malformed body", session: "not-checked" },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Substack identifier is required');
    });

    test("DELETE is 400 when the body is empty", async () => {
        const handler = findRouteHandler(substackRouter, 'delete', '/substack');
        assert.ok(handler, "Missing handler for substack endpoint");
        const { req, res } = mockSubStack({});
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Empty JSON Body');
    });

    test("DELETE is 403 when the session is missing", async () => {
        const handler = findRouteHandler(substackRouter, 'delete', '/substack');
        assert.ok(handler, "Missing handler for substack endpoint");
        const { req, res } = mockSubStack({
            body: {
                data: { substack_name: "", stack_identifier: "", substack_identifier: "00000000-0000-0000-0000-000000000000", users_list: [], balance: 0 },
                message: "No session",
                session: "",
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session ID Required');
    });

    test("DELETE is 400 when the body has no data", async () => {
        const handler = findRouteHandler(substackRouter, 'delete', '/substack');
        assert.ok(handler, "Missing handler for substack endpoint");
        const { req, res } = mockSubStack({
            body: { message: "Malformed body", session: "not-checked" },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Substack identifier is required');
    });

    test("GET /substacks is 400 when the query type is missing", async () => {
        const { session } = await createBoundUser("sub.notype@westack.cash");
        const handler = findRouteHandler(substackRouter, 'get', '/substacks');
        assert.ok(handler, "Missing handler for substack endpoint");
        const { req, res } = mockGetRequest({ headers: { "x-session": session } });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Substack query type is required');
    });

    test("GET /substacks is 400 when the query type is invalid", async () => {
        const { session } = await createBoundUser("sub.badtype@westack.cash");
        const handler = findRouteHandler(substackRouter, 'get', '/substacks');
        assert.ok(handler, "Missing handler for substack endpoint");
        const { req, res } = mockGetRequest({
            headers: { "x-session": session },
            query: { type: "nonsense" },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Invalid substack query type');
    });

    test("GET /substacks is 400 when the required identifier is missing", async () => {
        const { session } = await createBoundUser("sub.noident@westack.cash");
        const handler = findRouteHandler(substackRouter, 'get', '/substacks');
        assert.ok(handler, "Missing handler for substack endpoint");
        const { req, res } = mockGetRequest({
            headers: { "x-session": session },
            query: { type: SubStackQueryTypes.STACKID },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Stack identifier is required');
    });
});

suite("SubStack routes: authorization and edge cases", () => {
    test("POST is 403 when adding a substack to another user's stack", async () => {
        const owner = await createBoundUser("sub.post.owner@westack.cash");
        const attacker = await createBoundUser("sub.post.attacker@westack.cash");
        const stack = await createStack(owner.session, "Owner Stack");
        const handler = findRouteHandler(substackRouter, 'post', '/substack');
        assert.ok(handler, "Missing handler for substack endpoint");
        const { req, res } = mockSubStack({
            body: {
                data: {
                    substack_name: "Intruder Funds",
                    stack_identifier: stack.stack_identifier,
                    substack_identifier: "",
                    users_list: [],
                    balance: 0,
                },
                message: "Cross-user substack",
                session: attacker.session,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Forbidden');
    });

    test("POST is 403 on a session with no user bound", async () => {
        const owner = await createBoundUser("sub.post.anonowner@westack.cash");
        const stack = await createStack(owner.session, "Anon Target Stack");
        const anonymousSession = await createSession();
        const handler = findRouteHandler(substackRouter, 'post', '/substack');
        assert.ok(handler, "Missing handler for substack endpoint");
        const { req, res } = mockSubStack({
            body: {
                data: {
                    substack_name: "Anonymous Funds",
                    stack_identifier: stack.stack_identifier,
                    substack_identifier: "",
                    users_list: [],
                    balance: 0,
                },
                message: "Anonymous substack",
                session: anonymousSession,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session is not associated with a user');
    });

    test("POST is 400 when the substack name is too short", async () => {
        const owner = await createBoundUser("sub.post.shortname@westack.cash");
        const stack = await createStack(owner.session, "Short Name Stack");
        const handler = findRouteHandler(substackRouter, 'post', '/substack');
        assert.ok(handler, "Missing handler for substack endpoint");
        const { req, res } = mockSubStack({
            body: {
                data: {
                    substack_name: "ab",
                    stack_identifier: stack.stack_identifier,
                    substack_identifier: "",
                    users_list: [],
                    balance: 0,
                },
                message: "Too short",
                session: owner.session,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'SubStack fields are invalid');
    });

    test("POST sets users_list to the stack owner, ignoring the client-supplied list", async () => {
        const owner = await createBoundUser("sub.post.userslist@westack.cash");
        const stack = await createStack(owner.session, "Members Stack");
        const spoofed = "019e79e7-e656-794d-a5f1-dc999d6c9c77";
        const substack = await createSubstack(owner.session, stack.stack_identifier, "Members Funds", {
            users_list: [spoofed],
        });
        const members = substack.users_list as string[];
        assert.ok(members.includes(owner.user_identifier), "Owner should be in users_list");
        assert.ok(!members.includes(spoofed), "Client-supplied member should be ignored");
    });

    test("GET /substacks by stack id is 403 for a non-member", async () => {
        const owner = await createBoundUser("sub.get.stack.owner@westack.cash");
        const outsider = await createBoundUser("sub.get.stack.outsider@westack.cash");
        const stack = await createStack(owner.session, "Private Stack");
        await createSubstack(owner.session, stack.stack_identifier, "Private Funds");
        const handler = findRouteHandler(substackRouter, 'get', '/substacks');
        assert.ok(handler, "Missing handler for substack endpoint");
        const { req, res } = mockGetRequest({
            headers: { "x-session": outsider.session },
            query: { type: SubStackQueryTypes.STACKID, stack_identifier: stack.stack_identifier },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Forbidden');
    });

    test("GET /substacks by owner id is 403 when listing another user's substacks", async () => {
        const attacker = await createBoundUser("sub.get.owner.attacker@westack.cash");
        const victim = await createBoundUser("sub.get.owner.victim@westack.cash");
        const handler = findRouteHandler(substackRouter, 'get', '/substacks');
        assert.ok(handler, "Missing handler for substack endpoint");
        const { req, res } = mockGetRequest({
            headers: { "x-session": attacker.session },
            query: { type: SubStackQueryTypes.OWNERID, owner_identifier: victim.user_identifier },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Forbidden');
    });

    test("GET /substacks by name is readable by any authenticated user", async () => {
        const owner = await createBoundUser("sub.get.name.owner@westack.cash");
        const other = await createBoundUser("sub.get.name.other@westack.cash");
        const stack = await createStack(owner.session, "Named Lookup Stack");
        const uniqueName = `Public Lookup ${Date.now()}`;
        await createSubstack(owner.session, stack.stack_identifier, uniqueName);
        const handler = findRouteHandler(substackRouter, 'get', '/substacks');
        assert.ok(handler, "Missing handler for substack endpoint");
        const { req, res } = mockGetRequest({
            headers: { "x-session": other.session },
            query: { type: SubStackQueryTypes.SUBSTACKNAME, substack_name: uniqueName },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 200);
        assert.equal((res.body.data as unknown[]).length, 1);
    });

    test("PUT is 403 when renaming a substack the caller cannot access", async () => {
        const owner = await createBoundUser("sub.put.owner@westack.cash");
        const attacker = await createBoundUser("sub.put.attacker@westack.cash");
        const stack = await createStack(owner.session, "Rename Guard Stack");
        const substack = await createSubstack(owner.session, stack.stack_identifier, "Guarded Funds");
        const handler = findRouteHandler(substackRouter, 'put', '/substack');
        assert.ok(handler, "Missing handler for substack endpoint");
        const { req, res } = mockSubStack({
            body: {
                data: {
                    substack_name: "Hijacked Funds",
                    stack_identifier: "",
                    substack_identifier: substack.substack_identifier,
                    users_list: [],
                    balance: 0,
                },
                message: "Hijack rename",
                session: attacker.session,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Forbidden');
    });

    test("PUT is 400 when the new substack name is invalid", async () => {
        const owner = await createBoundUser("sub.put.invalidname@westack.cash");
        const stack = await createStack(owner.session, "Rename Invalid Stack");
        const substack = await createSubstack(owner.session, stack.stack_identifier, "Valid Funds");
        const handler = findRouteHandler(substackRouter, 'put', '/substack');
        assert.ok(handler, "Missing handler for substack endpoint");
        const { req, res } = mockSubStack({
            body: {
                data: {
                    substack_name: "no",
                    stack_identifier: "",
                    substack_identifier: substack.substack_identifier,
                    users_list: [],
                    balance: 0,
                },
                message: "Invalid rename",
                session: owner.session,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Substack name is invalid');
    });

    test("DELETE is 403 when deleting a substack the caller cannot access", async () => {
        const owner = await createBoundUser("sub.delete.owner@westack.cash");
        const attacker = await createBoundUser("sub.delete.attacker@westack.cash");
        const stack = await createStack(owner.session, "Delete Guard Stack");
        const substack = await createSubstack(owner.session, stack.stack_identifier, "Keep These Funds");
        const handler = findRouteHandler(substackRouter, 'delete', '/substack');
        assert.ok(handler, "Missing handler for substack endpoint");
        const { req, res } = mockSubStack({
            body: {
                data: {
                    substack_name: "",
                    stack_identifier: "",
                    substack_identifier: substack.substack_identifier,
                    users_list: [],
                    balance: 0,
                },
                message: "Hijack delete",
                session: attacker.session,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Forbidden');
    });

    test("A member (in users_list, not owner) can read and rename the substack", async () => {
        const owner = await createBoundUser("sub.member.owner@westack.cash");
        const member = await createBoundUser("sub.member.member@westack.cash");
        const stack = await createStack(owner.session, "Shared Stack");
        const substack = await createSubstack(owner.session, stack.stack_identifier, "Shared Funds");
        await setSubstackMembers(owner.session, substack, [owner.user_identifier, member.user_identifier]);

        // The member can read the stack's substacks via assertStackAccess.
        const listRes = await listByStack(member.session, stack.stack_identifier);
        assert.equal(listRes.statusCode, 200);

        // The member can rename via assertSubstackAccess.
        const handler = findRouteHandler(substackRouter, 'put', '/substack');
        assert.ok(handler, "Missing handler for substack endpoint");
        const { req, res } = mockSubStack({
            body: {
                data: {
                    substack_name: "Renamed By Member",
                    stack_identifier: "",
                    substack_identifier: substack.substack_identifier,
                    users_list: [owner.user_identifier, member.user_identifier],
                    balance: 0,
                },
                message: "Member rename",
                session: member.session,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 202);
        assert.equal(res.body.message, 'Accepted');

        const afterRename = await listByStack(owner.session, stack.stack_identifier);
        const renamed = (afterRename.body.data as unknown as SubStackAPIType[])
            .find((entry) => entry.substack_identifier === substack.substack_identifier);
        assert.ok(renamed, "Substack should still be listed after member rename");
        assert.equal(renamed?.substack_name, "Renamed By Member");
    });

    test("A member can delete the substack", async () => {
        const owner = await createBoundUser("sub.memberdel.owner@westack.cash");
        const member = await createBoundUser("sub.memberdel.member@westack.cash");
        const stack = await createStack(owner.session, "Shared Delete Stack");
        const substack = await createSubstack(owner.session, stack.stack_identifier, "Shared Delete Funds");
        await setSubstackMembers(owner.session, substack, [owner.user_identifier, member.user_identifier]);
        const handler = findRouteHandler(substackRouter, 'delete', '/substack');
        assert.ok(handler, "Missing handler for substack endpoint");
        const { req, res } = mockSubStack({
            body: {
                data: {
                    substack_name: "",
                    stack_identifier: "",
                    substack_identifier: substack.substack_identifier,
                    users_list: [],
                    balance: 0,
                },
                message: "Member delete",
                session: member.session,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 204);
        assert.equal(res.body.message, 'No Content');
    });
});

suite("SubStack routes: full lifecycle", () => {
    let session = "";
    let user = "";
    let stackId = "";
    let sharedSubStack = "";

    test("Sign up an owner and create a stack", async () => {
        const bound = await createBoundUser("sub.lifecycle@westack.cash");
        session = bound.session;
        user = bound.user_identifier;
        const stack = await createStack(session, "Company");
        stackId = stack.stack_identifier;
        assert.equal(stack.owner_identifier, user);
    });

    test("Create a substack seeded with the owner as sole member", async () => {
        const substack = await createSubstack(session, stackId, "Company Funds");
        assert.equal(substack.substack_name, "Company Funds");
        assert.notStrictEqual(null, substack.substack_identifier);
        assert.deepEqual(substack.users_list, [user]);
    });

    test("Create a substack with goal fields persisted", async () => {
        const substack = await createSubstack(session, stackId, "Air Conditioner", {
            goal_amount: 25000,
            goal_deadline: "2027-06-01T00:00:00.000Z",
        });
        assert.equal(substack.goal_amount, 25000);
        assert.notEqual(substack.goal_deadline, null);
        sharedSubStack = substack.substack_identifier;
    });

    test("List substacks by stack id returns both", async () => {
        const res = await listByStack(session, stackId);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.message, 'OK');
        assert.equal((res.body.data as unknown[]).length, 2);
    });

    test("List substacks by owner id returns both", async () => {
        const handler = findRouteHandler(substackRouter, 'get', '/substacks');
        assert.ok(handler, "Missing handler for substack endpoint");
        const { req, res } = mockGetRequest({
            headers: { "x-session": session },
            query: { type: SubStackQueryTypes.OWNERID, owner_identifier: user },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 200);
        assert.equal((res.body.data as unknown[]).length, 2);
    });

    test("Rename a substack and persist an added member", async () => {
        const handler = findRouteHandler(substackRouter, 'put', '/substack');
        assert.ok(handler, "Missing handler for substack endpoint");
        const extraMember = "019e79e7-e656-794d-a5f1-dc999d6c9c77";
        const { req, res } = mockSubStack({
            body: {
                data: {
                    substack_name: "Heat Pump",
                    stack_identifier: "",
                    substack_identifier: sharedSubStack,
                    users_list: [extraMember, user],
                    balance: 0,
                },
                message: "Rename substack",
                session,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 202);
        assert.equal(res.body.message, 'Accepted');
        assert.equal(res.body.data, null);

        const listRes = await listByStack(session, stackId);
        const renamed = (listRes.body.data as unknown as SubStackAPIType[])
            .find((entry) => entry.substack_identifier === sharedSubStack);
        assert.ok(renamed, "Renamed substack should still be listed");
        assert.equal(renamed?.substack_name, "Heat Pump");
        assert.ok((renamed?.users_list as string[]).includes(extraMember), "Added member should persist");
    });

    test("Delete a substack and confirm it drops from the listing", async () => {
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
                session,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 204);
        assert.equal(res.body.message, 'No Content');
        assert.equal(res.body.data, null);

        const listRes = await listByStack(session, stackId);
        const remaining = listRes.body.data as unknown as SubStackAPIType[];
        assert.equal(remaining.length, 1);
        assert.ok(!remaining.some((entry) => entry.substack_identifier === sharedSubStack), "Deleted substack should be gone");
    });
});

after(async () => {
    // Defer the pool-closing beforeExit so the final suite's last test has
    // settled before shutdown; emitting it synchronously races the last test.
    await new Promise((resolve) => setTimeout(resolve, 250));
    process.emit('beforeExit', 0);
});

import { after, suite, test } from "node:test";
import assert from "node:assert";
import { router as sessionRouter } from "../../main/ts/controllers/SessionController.ts";
import { router as userRouter } from "../../main/ts/controllers/UserController.ts";
import { router as stackRouter } from "../../main/ts/controllers/StackController.ts";
import { findRouteHandler, mockGetRequest, mockSession, mockUser, mockStack } from "./mocks.ts";
import { SubscriptionType } from "../../main/ts/types/SubscriptionTypes.ts";
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
                firstname: "Stack",
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

async function createStack(session: string, owner_identifier: string, name: string, extra: Partial<StackAPIType> = {}): Promise<StackAPIType> {
    const handler = findRouteHandler(stackRouter, 'post', '/stack');
    assert.ok(handler, "Missing handler for stack endpoint");
    const { req, res } = mockStack({
        body: {
            data: {
                stack_name: name,
                stack_identifier: "",
                owner_identifier,
                ...extra,
            },
            message: `Create ${name}`,
            session,
        },
    });
    // @ts-expect-error req is fine as-is
    await handler(req, res, null);
    assert.equal(res.statusCode, 201);
    return res.body.data as unknown as StackAPIType;
}

suite("Stack routes: input validation and missing session", () => {
    test("POST is 400 when the body is empty", async () => {
        const handler = findRouteHandler(stackRouter, 'post', '/stack');
        assert.ok(handler, "Missing handler for stack endpoint");
        const { req, res } = mockStack({});
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Empty JSON body');
    });

    test("POST is 403 when the session is missing", async () => {
        const handler = findRouteHandler(stackRouter, 'post', '/stack');
        assert.ok(handler, "Missing handler for stack endpoint");
        const { req, res } = mockStack({
            body: {
                data: { stack_name: "No Session Stack", stack_identifier: "", owner_identifier: "" },
                message: "Test unauthorized response",
                session: "",
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session ID Required');
    });

    test("POST is 400 when the body has no data", async () => {
        const handler = findRouteHandler(stackRouter, 'post', '/stack');
        assert.ok(handler, "Missing handler for stack endpoint");
        const { req, res } = mockStack({
            body: { message: "Malformed body", session: "not-checked" },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Stack name is required');
    });

    test("PUT is 400 when the body is empty", async () => {
        const handler = findRouteHandler(stackRouter, 'put', '/stack');
        assert.ok(handler, "Missing handler for stack endpoint");
        const { req, res } = mockStack({});
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Empty JSON body');
    });

    test("PUT is 403 when the session is missing", async () => {
        const handler = findRouteHandler(stackRouter, 'put', '/stack');
        assert.ok(handler, "Missing handler for stack endpoint");
        const { req, res } = mockStack({
            body: {
                data: { stack_name: "Renamed", stack_identifier: "00000000-0000-0000-0000-000000000000", owner_identifier: "" },
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
        const handler = findRouteHandler(stackRouter, 'put', '/stack');
        assert.ok(handler, "Missing handler for stack endpoint");
        const { req, res } = mockStack({
            body: { message: "Malformed body", session: "not-checked" },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Stack identifier is required');
    });

    test("DELETE is 400 when the body is empty", async () => {
        const handler = findRouteHandler(stackRouter, 'delete', '/stack');
        assert.ok(handler, "Missing handler for stack endpoint");
        const { req, res } = mockStack({});
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Empty JSON body');
    });

    test("DELETE is 403 when the session is missing", async () => {
        const handler = findRouteHandler(stackRouter, 'delete', '/stack');
        assert.ok(handler, "Missing handler for stack endpoint");
        const { req, res } = mockStack({
            body: {
                data: { stack_name: "", stack_identifier: "00000000-0000-0000-0000-000000000000", owner_identifier: "" },
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
        const handler = findRouteHandler(stackRouter, 'delete', '/stack');
        assert.ok(handler, "Missing handler for stack endpoint");
        const { req, res } = mockStack({
            body: { message: "Malformed body", session: "not-checked" },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Stack identifier is required');
    });
});

suite("Stack routes: authorization and edge cases", () => {
    test("POST forces the owner to the acting user, ignoring a spoofed owner_identifier", async () => {
        const attacker = await createBoundUser("stack.spoof.owner@westack.cash");
        const victim = await createBoundUser("stack.spoof.victim@westack.cash");
        const handler = findRouteHandler(stackRouter, 'post', '/stack');
        assert.ok(handler, "Missing handler for stack endpoint");
        const { req, res } = mockStack({
            body: {
                data: { stack_name: "Spoofed", stack_identifier: "", owner_identifier: victim.user_identifier },
                message: "Spoof owner",
                session: attacker.session,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 201);
        assert.equal(res.body.data.owner_identifier, attacker.user_identifier);
    });

    test("POST is 400 when the stack name is too short", async () => {
        const { session, user_identifier } = await createBoundUser("stack.shortname@westack.cash");
        const handler = findRouteHandler(stackRouter, 'post', '/stack');
        assert.ok(handler, "Missing handler for stack endpoint");
        const { req, res } = mockStack({
            body: {
                data: { stack_name: "ab", stack_identifier: "", owner_identifier: user_identifier },
                message: "Too short",
                session,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Stack fields are invalid');
    });

    test("POST is 403 on a session with no user bound", async () => {
        const anonymousSession = await createSession();
        const handler = findRouteHandler(stackRouter, 'post', '/stack');
        assert.ok(handler, "Missing handler for stack endpoint");
        const { req, res } = mockStack({
            body: {
                data: { stack_name: "Anonymous", stack_identifier: "", owner_identifier: "" },
                message: "Anonymous create",
                session: anonymousSession,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session is not associated with a user');
    });

    test("GET /stacks is 403 when listing another user's stacks", async () => {
        const attacker = await createBoundUser("stack.list.attacker@westack.cash");
        const victim = await createBoundUser("stack.list.victim@westack.cash");
        const handler = findRouteHandler(stackRouter, 'get', '/stacks');
        assert.ok(handler, "Missing handler for stack endpoint");
        const { req, res } = mockGetRequest({
            headers: { "x-session": attacker.session },
            query: { owner_identifier: victim.user_identifier },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Forbidden');
    });

    test("GET /stacks is 400 when the owner identifier is missing", async () => {
        const { session } = await createBoundUser("stack.list.noowner@westack.cash");
        const handler = findRouteHandler(stackRouter, 'get', '/stacks');
        assert.ok(handler, "Missing handler for stack endpoint");
        const { req, res } = mockGetRequest({ headers: { "x-session": session } });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Owner identifier is required');
    });

    test("GET /stack/members returns the owner for the owning user", async () => {
        const { session, user_identifier } = await createBoundUser("stack.members.owner@westack.cash");
        const stack = await createStack(session, user_identifier, "Members Stack");
        const handler = findRouteHandler(stackRouter, 'get', '/stack/members');
        assert.ok(handler, "Missing handler for stack endpoint");
        const { req, res } = mockGetRequest({
            headers: { "x-session": session },
            query: { stack_identifier: stack.stack_identifier },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.message, 'OK');
        const members = res.body.data as unknown as Array<{ user_identifier: string; role: string }>;
        const owner = members.find((member) => member.user_identifier === user_identifier);
        assert.ok(owner, "Owner should appear in the member roster");
        assert.equal(owner?.role, 'owner');
    });

    test("GET /stack/members is 403 for a non-member", async () => {
        const owner = await createBoundUser("stack.members.real@westack.cash");
        const outsider = await createBoundUser("stack.members.outsider@westack.cash");
        const stack = await createStack(owner.session, owner.user_identifier, "Private Stack");
        const handler = findRouteHandler(stackRouter, 'get', '/stack/members');
        assert.ok(handler, "Missing handler for stack endpoint");
        const { req, res } = mockGetRequest({
            headers: { "x-session": outsider.session },
            query: { stack_identifier: stack.stack_identifier },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Forbidden');
    });

    test("GET /stack/members is 400 when the stack identifier is missing", async () => {
        const { session } = await createBoundUser("stack.members.noid@westack.cash");
        const handler = findRouteHandler(stackRouter, 'get', '/stack/members');
        assert.ok(handler, "Missing handler for stack endpoint");
        const { req, res } = mockGetRequest({ headers: { "x-session": session } });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Stack identifier is required');
    });

    test("PUT is 403 when renaming another user's stack", async () => {
        const owner = await createBoundUser("stack.rename.owner@westack.cash");
        const attacker = await createBoundUser("stack.rename.attacker@westack.cash");
        const stack = await createStack(owner.session, owner.user_identifier, "Owned Stack");
        const handler = findRouteHandler(stackRouter, 'put', '/stack');
        assert.ok(handler, "Missing handler for stack endpoint");
        const { req, res } = mockStack({
            body: {
                data: { stack_name: "Hijacked", stack_identifier: stack.stack_identifier, owner_identifier: "" },
                message: "Hijack rename",
                session: attacker.session,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Forbidden');
    });

    test("PUT is 400 when the new stack name is invalid", async () => {
        const { session, user_identifier } = await createBoundUser("stack.rename.invalid@westack.cash");
        const stack = await createStack(session, user_identifier, "Valid Name");
        const handler = findRouteHandler(stackRouter, 'put', '/stack');
        assert.ok(handler, "Missing handler for stack endpoint");
        const { req, res } = mockStack({
            body: {
                data: { stack_name: "no", stack_identifier: stack.stack_identifier, owner_identifier: "" },
                message: "Invalid rename",
                session,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Stack name is invalid');
    });

    test("DELETE is 403 when deleting another user's stack", async () => {
        const owner = await createBoundUser("stack.delete.owner@westack.cash");
        const attacker = await createBoundUser("stack.delete.attacker@westack.cash");
        const stack = await createStack(owner.session, owner.user_identifier, "Keep This Stack");
        const handler = findRouteHandler(stackRouter, 'delete', '/stack');
        assert.ok(handler, "Missing handler for stack endpoint");
        const { req, res } = mockStack({
            body: {
                data: { stack_name: "", stack_identifier: stack.stack_identifier, owner_identifier: "" },
                message: "Hijack delete",
                session: attacker.session,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Forbidden');
    });
});

suite("Stack routes: full lifecycle", () => {
    let session = "";
    let user = "";
    let sharedStack = "";

    test("Sign up an owner", async () => {
        const bound = await createBoundUser("stack.lifecycle@westack.cash");
        session = bound.session;
        user = bound.user_identifier;
        assert.equal(user.length, 36);
    });

    test("Create a stack", async () => {
        const stack = await createStack(session, user, "Vacation");
        assert.equal(stack.stack_name, "Vacation");
        assert.equal(stack.owner_identifier, user);
        sharedStack = stack.stack_identifier;
    });

    test("Create a stack with goal fields persisted", async () => {
        const stack = await createStack(session, user, "Tools", {
            goal_amount: 50000,
            goal_deadline: "2027-01-01T00:00:00.000Z",
            category: "travel",
            emoji: "✈️",
        });
        assert.equal(stack.goal_amount, 50000);
        assert.equal(stack.category, "travel");
        assert.equal(stack.emoji, "✈️");
        assert.notEqual(stack.goal_deadline, null);
    });

    test("List the owner's stacks", async () => {
        const handler = findRouteHandler(stackRouter, 'get', '/stacks');
        assert.ok(handler, "Missing handler for stack endpoint");
        const { req, res } = mockGetRequest({
            headers: { "x-session": session },
            query: { owner_identifier: user },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.message, 'OK');
        assert.equal((res.body.data as unknown[]).length, 2);
    });

    test("Rename a stack", async () => {
        const handler = findRouteHandler(stackRouter, 'put', '/stack');
        assert.ok(handler, "Missing handler for stack endpoint");
        const { req, res } = mockStack({
            body: {
                data: { stack_name: "Appliances", stack_identifier: sharedStack, owner_identifier: "" },
                message: "Rename a stack",
                session,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 202);
        assert.equal(res.body.message, 'Accepted');
    });

    test("Delete a stack", async () => {
        const handler = findRouteHandler(stackRouter, 'delete', '/stack');
        assert.ok(handler, "Missing handler for stack endpoint");
        const { req, res } = mockStack({
            body: {
                data: { stack_name: "", stack_identifier: sharedStack, owner_identifier: "" },
                message: "Delete a stack",
                session,
            },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 204);
        assert.equal(res.body.message, 'No Content');
    });

    test("Deleted stack no longer appears in the listing", async () => {
        const handler = findRouteHandler(stackRouter, 'get', '/stacks');
        assert.ok(handler, "Missing handler for stack endpoint");
        const { req, res } = mockGetRequest({
            headers: { "x-session": session },
            query: { owner_identifier: user },
        });
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 200);
        const remaining = res.body.data as unknown as Array<{ stack_identifier: string }>;
        assert.equal(remaining.length, 1);
        assert.ok(!remaining.some((stack) => stack.stack_identifier === sharedStack), "Deleted stack should be gone");
    });
});
after(async () => {
    // Defer the pool-closing beforeExit so the final suite's last test has
    // settled before shutdown; emitting it synchronously races the last test.
    await new Promise((resolve) => setTimeout(resolve, 250));
    process.emit('beforeExit');
});

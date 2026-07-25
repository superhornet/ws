import { after, suite, test } from "node:test";
import assert from "node:assert";
import { router as sessionRouter } from "../../main/ts/controllers/SessionController.ts";
import { router as userRouter } from "../../main/ts/controllers/UserController.ts";
import { router as stackRouter } from "../../main/ts/controllers/StackController.ts";
import { router as substackRouter } from "../../main/ts/controllers/SubstackController.ts";
import { router as transactionRouter } from "../../main/ts/controllers/TransactionController.ts";
import { findRouteHandler, mockGetRequest, mockSession, mockUser, mockStack, mockSubStack, mockTransaction } from "./mocks.ts";
import { TransactionItemType, TransactionProcessorType, TransactionQueryTypes, type TransactionAPIType } from "../../main/ts/types/TransactionAPITypes.ts";
import { SubscriptionType } from "../../main/ts/types/SubscriptionTypes.ts";
import { SubStackQueryTypes, type SubStackAPIType } from "../../main/ts/types/SubStackAPITypes.ts";
import type { StackAPIType } from "../../main/ts/types/StackAPITypes.ts";

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
 * Signs up a fresh user on its own session and returns both, so authorization
 * tests can act as (or against) a specific bound user.
 */
async function createBoundUser(label: string): Promise<{ session: string; user_identifier: string }> {
    const session = await createSession();
    const handler = findRouteHandler(userRouter, 'post', '/user');
    assert.ok(handler, "Missing handler for user post");
    const { req, res } = mockUser({
        body: {
            data: {
                firstname: "Tx",
                lastname: "Owner",
                email: `${label}.${RUN}@westack.cash`,
                address1: "1 Test St",
                address2: "",
                city: "Testville",
                state: "FL",
                zipcode: "33101",
                subscription_level: SubscriptionType.PRO,
            },
            message: `Signup ${label}`,
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

/**
 * Creates a substack. `balance` is stored verbatim in cents (integer), so pass
 * cents here; transaction `amount`s below are in dollars.
 */
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
 * persists `users_list` verbatim.
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

type TransactionOverrides = Partial<TransactionAPIType> & { from_identifier: string };

async function postTransaction(session: string | undefined, overrides: TransactionOverrides) {
    const handler = findRouteHandler(transactionRouter, 'post', '/transaction');
    assert.ok(handler, "Missing handler for transaction endpoint");
    const data: TransactionAPIType = {
        initiated_by: "",
        notation: "Test transfer",
        processor: TransactionProcessorType.INTERNAL,
        transaction_type: TransactionItemType.INITIAL_FUND,
        amount: 1,
        to_identifier: "",
        ...overrides,
    };
    const { req, res } = mockTransaction({
        body: {
            data,
            message: "Transfer",
            ...(session !== undefined ? { session } : {}),
        },
    });
    // @ts-expect-error req is fine as-is
    await handler(req, res, null);
    return res;
}

async function getTransactions(opts: { session?: string; key?: string; value?: string }) {
    const handler = findRouteHandler(transactionRouter, 'get', '/transactions');
    assert.ok(handler, "Missing handler for transactions endpoint");
    const query: Record<string, string> = {};
    if (opts.key !== undefined) query.key = opts.key;
    if (opts.value !== undefined) query.value = opts.value;
    const { req, res } = mockGetRequest({
        headers: opts.session !== undefined ? { "x-session": opts.session } : {},
        query,
    });
    // @ts-expect-error req is fine as-is
    await handler(req, res, null);
    return res;
}

async function listSubstacks(session: string, stack_identifier: string): Promise<SubStackAPIType[]> {
    const handler = findRouteHandler(substackRouter, 'get', '/substacks');
    assert.ok(handler, "Missing handler for substack endpoint");
    const { req, res } = mockGetRequest({
        headers: { "x-session": session },
        query: { type: SubStackQueryTypes.STACKID, stack_identifier },
    });
    // @ts-expect-error req is fine as-is
    await handler(req, res, null);
    return res.body.data as unknown as SubStackAPIType[];
}

/** Reads a substack's stored balance (cents) back through the substack listing. */
async function balanceOf(session: string, stack_identifier: string, substack_identifier: string): Promise<number | undefined> {
    const list = await listSubstacks(session, stack_identifier);
    return list.find((entry) => entry.substack_identifier === substack_identifier)?.balance;
}

suite("Transaction routes: input validation and missing session", () => {
    test("POST is 400 when the body is empty", async () => {
        const handler = findRouteHandler(transactionRouter, 'post', '/transaction');
        assert.ok(handler, "Missing handler for transaction endpoint");
        const { req, res } = mockTransaction({});
        // @ts-expect-error req is fine as-is
        await handler(req, res, null);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Empty JSON Body');
    });

    test("POST is 400 when the source identifier is missing", async () => {
        // A well-formed body minus the source GUID: the malformed-body check runs
        // during plan(), before session resolution, so this is a 400 not a 403.
        const res = await postTransaction("does-not-matter", {
            from_identifier: "",
            to_identifier: "11111111-1111-1111-1111-111111111111",
        });
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Transaction source GUID is required');
    });

    test("POST is 403 when the session is missing", async () => {
        const res = await postTransaction(undefined, {
            from_identifier: "00000000-0000-0000-0000-000000000000",
            to_identifier: "11111111-1111-1111-1111-111111111111",
        });
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session ID Required');
    });

    test("GET is 400 when the query key is missing", async () => {
        const { session } = await createBoundUser("tx.get.nokey");
        const res = await getTransactions({ session, value: "anything" });
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Transaction query key is required');
    });

    test("GET is 400 when the query value is missing", async () => {
        const { session } = await createBoundUser("tx.get.noval");
        const res = await getTransactions({ session, key: TransactionQueryTypes.USER });
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Transaction query value is required');
    });

    test("GET is 400 when the query key is invalid", async () => {
        const { session } = await createBoundUser("tx.get.badkey");
        const res = await getTransactions({ session, key: "nonsense", value: "anything" });
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Invalid transaction query key');
    });

    test("GET is 403 when the session is missing", async () => {
        const res = await getTransactions({
            key: TransactionQueryTypes.USER,
            value: "00000000-0000-0000-0000-000000000000",
        });
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session ID Required');
    });
});

suite("Transaction routes: authorization", () => {
    test("POST is 403 when transacting out of another user's substack", async () => {
        const owner = await createBoundUser("tx.authz.owner");
        const attacker = await createBoundUser("tx.authz.attacker");
        const stack = await createStack(owner.session, "Owner Stack");
        const source = await createSubstack(owner.session, stack.stack_identifier, "Owner Source", { balance: 100000 });
        const dest = await createSubstack(owner.session, stack.stack_identifier, "Owner Dest");
        const res = await postTransaction(attacker.session, {
            from_identifier: source.substack_identifier,
            to_identifier: dest.substack_identifier,
            amount: 10,
        });
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Forbidden');
    });

    test("POST is 403 on a valid session with no user bound", async () => {
        const owner = await createBoundUser("tx.authz.anonowner");
        const stack = await createStack(owner.session, "Anon Target Stack");
        const source = await createSubstack(owner.session, stack.stack_identifier, "Anon Source", { balance: 100000 });
        const dest = await createSubstack(owner.session, stack.stack_identifier, "Anon Dest");
        const anonymousSession = await createSession();
        const res = await postTransaction(anonymousSession, {
            from_identifier: source.substack_identifier,
            to_identifier: dest.substack_identifier,
            amount: 10,
        });
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Session is not associated with a user');
    });

    test("POST records the acting user as initiator, ignoring a spoofed initiated_by", async () => {
        const owner = await createBoundUser("tx.authz.spoof.owner");
        const attacker = await createBoundUser("tx.authz.spoof.attacker");
        const stack = await createStack(owner.session, "Spoof Stack");
        const source = await createSubstack(owner.session, stack.stack_identifier, "Spoof Source", { balance: 100000 });
        const dest = await createSubstack(owner.session, stack.stack_identifier, "Spoof Dest");
        const res = await postTransaction(owner.session, {
            from_identifier: source.substack_identifier,
            to_identifier: dest.substack_identifier,
            amount: 10,
            initiated_by: attacker.user_identifier, // spoof attempt
        });
        assert.equal(res.statusCode, 201);

        const listed = await getTransactions({ session: owner.session, key: TransactionQueryTypes.SUBSTACK, value: source.substack_identifier });
        assert.equal(listed.statusCode, 200);
        const rows = listed.body.data as unknown as TransactionAPIType[];
        assert.equal(rows.length, 1);
        assert.equal(rows[0]?.initiated_by, owner.user_identifier);
        assert.notEqual(rows[0]?.initiated_by, attacker.user_identifier);
    });

    test("POST is 403 (model guard) when the initiator is not a member of the source substack", async () => {
        // Controller access (assertSubstackAccess) passes for the stack owner even
        // when they are absent from users_list, but the model's own membership
        // check still rejects — exercising the layered guard in storeTransaction.
        const owner = await createBoundUser("tx.authz.member.owner");
        const other = await createBoundUser("tx.authz.member.other");
        const stack = await createStack(owner.session, "Member Guard Stack");
        const source = await createSubstack(owner.session, stack.stack_identifier, "Guard Source", { balance: 100000 });
        const dest = await createSubstack(owner.session, stack.stack_identifier, "Guard Dest");
        // Drop the owner from the source's members while they still own the stack.
        await setSubstackMembers(owner.session, source, [other.user_identifier]);
        const res = await postTransaction(owner.session, {
            from_identifier: source.substack_identifier,
            to_identifier: dest.substack_identifier,
            amount: 10,
        });
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Not authorized to transact on this substack');
    });

    test("GET by user is 403 when listing another user's transactions", async () => {
        const attacker = await createBoundUser("tx.get.user.attacker");
        const victim = await createBoundUser("tx.get.user.victim");
        const res = await getTransactions({ session: attacker.session, key: TransactionQueryTypes.USER, value: victim.user_identifier });
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Forbidden');
    });

    test("GET by stack is 403 for a non-member", async () => {
        const owner = await createBoundUser("tx.get.stack.owner");
        const outsider = await createBoundUser("tx.get.stack.outsider");
        const stack = await createStack(owner.session, "Private Stack");
        await createSubstack(owner.session, stack.stack_identifier, "Private Funds");
        const res = await getTransactions({ session: outsider.session, key: TransactionQueryTypes.STACK, value: stack.stack_identifier });
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Forbidden');
    });

    test("GET by substack is 403 for a non-member", async () => {
        const owner = await createBoundUser("tx.get.substack.owner");
        const outsider = await createBoundUser("tx.get.substack.outsider");
        const stack = await createStack(owner.session, "Private Substack Stack");
        const substack = await createSubstack(owner.session, stack.stack_identifier, "Private Substack Funds");
        const res = await getTransactions({ session: outsider.session, key: TransactionQueryTypes.SUBSTACK, value: substack.substack_identifier });
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, 'Forbidden');
    });
});

suite("Transaction routes: transfer lifecycle and balances", () => {
    test("A transfer moves the balance from source to destination", async () => {
        const owner = await createBoundUser("tx.balance.owner");
        const stack = await createStack(owner.session, "Balance Stack");
        const source = await createSubstack(owner.session, stack.stack_identifier, "Balance Source", { balance: 100000 }); // $1,000.00
        const dest = await createSubstack(owner.session, stack.stack_identifier, "Balance Dest");
        const res = await postTransaction(owner.session, {
            from_identifier: source.substack_identifier,
            to_identifier: dest.substack_identifier,
            amount: 50, // $50.00
            notation: "Fund the destination",
        });
        assert.equal(res.statusCode, 201);
        // Balances are stored in cents: $1,000 - $50 = $950; $0 + $50 = $50.
        assert.equal(await balanceOf(owner.session, stack.stack_identifier, source.substack_identifier), 95000);
        assert.equal(await balanceOf(owner.session, stack.stack_identifier, dest.substack_identifier), 5000);
    });

    test("Concurrent transfers from the same source cannot overdraw it (H2)", async () => {
        const owner = await createBoundUser("tx.race.owner");
        const stack = await createStack(owner.session, "Race Stack");
        const source = await createSubstack(owner.session, stack.stack_identifier, "Race Source", { balance: 100000 }); // $1,000.00
        const destA = await createSubstack(owner.session, stack.stack_identifier, "Race Dest A");
        const destB = await createSubstack(owner.session, stack.stack_identifier, "Race Dest B");

        // Two simultaneous $800 transfers out of a $1,000 source. Only one can
        // succeed; the atomic guarded debit must reject the other rather than
        // letting both read the same balance and mint money.
        const [resA, resB] = await Promise.all([
            postTransaction(owner.session, {
                from_identifier: source.substack_identifier,
                to_identifier: destA.substack_identifier,
                amount: 800,
            }),
            postTransaction(owner.session, {
                from_identifier: source.substack_identifier,
                to_identifier: destB.substack_identifier,
                amount: 800,
            }),
        ]);

        const statuses = [resA.statusCode, resB.statusCode].sort((first, second) => first - second);
        assert.deepEqual(statuses, [201, 400], `expected one success and one rejection, got ${statuses}`);

        // Money is conserved: the source is debited exactly once and exactly one
        // destination is credited (total credited = the single $800 that cleared).
        const sourceBalance = await balanceOf(owner.session, stack.stack_identifier, source.substack_identifier);
        const destABalance = await balanceOf(owner.session, stack.stack_identifier, destA.substack_identifier);
        const destBBalance = await balanceOf(owner.session, stack.stack_identifier, destB.substack_identifier);
        assert.equal(sourceBalance, 20000); // $1,000 - $800
        assert.equal((destABalance ?? 0) + (destBBalance ?? 0), 80000); // exactly one $800 credit
    });

    test("A transfer exceeding the source balance is rejected as insufficient funds", async () => {
        const owner = await createBoundUser("tx.insufficient.owner");
        const stack = await createStack(owner.session, "Insufficient Stack");
        const source = await createSubstack(owner.session, stack.stack_identifier, "Thin Source", { balance: 100 }); // $1.00
        const dest = await createSubstack(owner.session, stack.stack_identifier, "Insufficient Dest");
        const res = await postTransaction(owner.session, {
            from_identifier: source.substack_identifier,
            to_identifier: dest.substack_identifier,
            amount: 200, // $200.00 > $1.00
        });
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Insufficient funds');
        // The failed transfer must not have moved any money.
        assert.equal(await balanceOf(owner.session, stack.stack_identifier, source.substack_identifier), 100);
        assert.equal(await balanceOf(owner.session, stack.stack_identifier, dest.substack_identifier), 0);
    });

    test("A zero amount is rejected as invalid", async () => {
        const owner = await createBoundUser("tx.zero.owner");
        const stack = await createStack(owner.session, "Zero Stack");
        const source = await createSubstack(owner.session, stack.stack_identifier, "Zero Source", { balance: 100000 });
        const dest = await createSubstack(owner.session, stack.stack_identifier, "Zero Dest");
        const res = await postTransaction(owner.session, {
            from_identifier: source.substack_identifier,
            to_identifier: dest.substack_identifier,
            amount: 0,
        });
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Transaction fields are invalid');
    });

    test("A negative amount is rejected as invalid", async () => {
        const owner = await createBoundUser("tx.negative.owner");
        const stack = await createStack(owner.session, "Negative Stack");
        const source = await createSubstack(owner.session, stack.stack_identifier, "Negative Source", { balance: 100000 });
        const dest = await createSubstack(owner.session, stack.stack_identifier, "Negative Dest");
        const res = await postTransaction(owner.session, {
            from_identifier: source.substack_identifier,
            to_identifier: dest.substack_identifier,
            amount: -5,
        });
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Transaction fields are invalid');
    });

    test("An amount above the $10,000 cap is rejected as invalid", async () => {
        const owner = await createBoundUser("tx.overmax.owner");
        const stack = await createStack(owner.session, "Overmax Stack");
        // Fund generously so the amount clears the balance check and reaches the
        // amount validator rather than tripping insufficient funds first.
        const source = await createSubstack(owner.session, stack.stack_identifier, "Overmax Source", { balance: 200000000 });
        const dest = await createSubstack(owner.session, stack.stack_identifier, "Overmax Dest");
        const res = await postTransaction(owner.session, {
            from_identifier: source.substack_identifier,
            to_identifier: dest.substack_identifier,
            amount: 10000.5, // above the floatMax of 10000.01
        });
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Transaction fields are invalid');
    });

    test("A notation longer than the limit is rejected as invalid", async () => {
        const owner = await createBoundUser("tx.longnote.owner");
        const stack = await createStack(owner.session, "Longnote Stack");
        const source = await createSubstack(owner.session, stack.stack_identifier, "Longnote Source", { balance: 100000 });
        const dest = await createSubstack(owner.session, stack.stack_identifier, "Longnote Dest");
        const res = await postTransaction(owner.session, {
            from_identifier: source.substack_identifier,
            to_identifier: dest.substack_identifier,
            amount: 10,
            notation: "x".repeat(513), // exceeds the 512-char maximum
        });
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Transaction fields are invalid');
    });

    test("A missing destination identifier is not silently accepted", async () => {
        // The controller only guards `from_identifier`; a missing `to_identifier`
        // is currently unvalidated and fails deeper in the stack. This pins that
        // the request is rejected rather than succeeding — ideally the controller
        // would guard `to_identifier` symmetrically and return a 400.
        const owner = await createBoundUser("tx.noto.owner");
        const stack = await createStack(owner.session, "NoTo Stack");
        const source = await createSubstack(owner.session, stack.stack_identifier, "NoTo Source", { balance: 100000 });
        const res = await postTransaction(owner.session, {
            from_identifier: source.substack_identifier,
            to_identifier: "",
            amount: 10,
        });
        assert.notEqual(res.statusCode, 201);
        assert.ok(res.statusCode >= 400, `expected a failure status, got ${res.statusCode}`);
    });

    test("A model-raised 500 returns a generic body, not internal detail (M1)", async () => {
        // A malformed (non-UUID) destination makes the credit UPDATE raise a raw
        // Postgres error, which the model wraps as a 500. The client must see a
        // generic message, never the underlying database/SQL detail.
        const owner = await createBoundUser("tx.m1.owner");
        const stack = await createStack(owner.session, "M1 Stack");
        const source = await createSubstack(owner.session, stack.stack_identifier, "M1 Source", { balance: 100000 });
        const res = await postTransaction(owner.session, {
            from_identifier: source.substack_identifier,
            to_identifier: "not-a-uuid",
            amount: 10,
        });
        assert.equal(res.statusCode, 500);
        assert.equal(res.body.message, "Internal Server Error");
    });
});

suite("Transaction routes: processor fees", () => {
    test("Fee-bearing processors record a Service Fee without deducting it from balances", async () => {
        const owner = await createBoundUser("tx.fee.owner");
        const stack = await createStack(owner.session, "Fee Stack");
        // getFeeSubStack() routes the Service Fee to a substack literally named
        // "Company Funds"; create one so the fee insert has a valid destination.
        await createSubstack(owner.session, stack.stack_identifier, "Company Funds");
        const source = await createSubstack(owner.session, stack.stack_identifier, "Fee Source", { balance: 1000000 }); // $10,000.00
        const dest = await createSubstack(owner.session, stack.stack_identifier, "Fee Dest");

        // Three tiers of the fee schedule:
        //   amount <= $75      -> $0.75 flat
        //   $75 < amount <= $2500 -> 1% of amount
        //   amount > $2500     -> $25 flat
        const tiers: Array<{ amount: number; feeCents: number }> = [
            { amount: 50, feeCents: 75 },     // $0.75
            { amount: 500, feeCents: 500 },   // 1% of $500 = $5.00
            { amount: 3000, feeCents: 2500 }, // $25.00
        ];
        for (const tier of tiers) {
            const res = await postTransaction(owner.session, {
                from_identifier: source.substack_identifier,
                to_identifier: dest.substack_identifier,
                amount: tier.amount,
                processor: TransactionProcessorType.GOOGLE,
                transaction_type: TransactionItemType.INITIAL_FUND,
                notation: `Fee tier ${tier.amount}`,
            });
            assert.equal(res.statusCode, 201);
        }

        // Read the source's ledger: it holds each main transfer (from = source)
        // plus each Service Fee (also from = source), and nothing else.
        const listed = await getTransactions({ session: owner.session, key: TransactionQueryTypes.SUBSTACK, value: source.substack_identifier });
        assert.equal(listed.statusCode, 200);
        const rows = listed.body.data as unknown as TransactionAPIType[];
        const feeAmounts = rows
            .filter((row) => row.notation === "Service Fee")
            .map((row) => row.amount)
            .sort((first, second) => first - second);
        assert.deepEqual(feeAmounts, [75, 500, 2500]);

        // Fees are recorded but not deducted (the balance -= fee line is disabled),
        // so the source only loses the three transfer amounts: $50 + $500 + $3000.
        assert.equal(await balanceOf(owner.session, stack.stack_identifier, source.substack_identifier), 1000000 - 355000);
        assert.equal(await balanceOf(owner.session, stack.stack_identifier, dest.substack_identifier), 355000);
    });
});

suite("Transaction routes: read scoping", () => {
    test("List transactions by substack, stack, and user", async () => {
        const owner = await createBoundUser("tx.read.owner");
        const stack = await createStack(owner.session, "Read Stack");
        const source = await createSubstack(owner.session, stack.stack_identifier, "Read Source", { balance: 100000 });
        const goalA = await createSubstack(owner.session, stack.stack_identifier, "Read Goal A");
        const goalB = await createSubstack(owner.session, stack.stack_identifier, "Read Goal B");

        for (const target of [goalA, goalB]) {
            const res = await postTransaction(owner.session, {
                from_identifier: source.substack_identifier,
                to_identifier: target.substack_identifier,
                amount: 10,
                notation: `Fund ${target.substack_name}`,
            });
            assert.equal(res.statusCode, 201);
        }

        // Substack scope: the source is the `from` of both transfers.
        const bySource = await getTransactions({ session: owner.session, key: TransactionQueryTypes.SUBSTACK, value: source.substack_identifier });
        assert.equal(bySource.statusCode, 200);
        assert.equal((bySource.body.data as unknown[]).length, 2);

        // Substack scope: goal A is the `to` of exactly one transfer.
        const byGoalA = await getTransactions({ session: owner.session, key: TransactionQueryTypes.SUBSTACK, value: goalA.substack_identifier });
        assert.equal(byGoalA.statusCode, 200);
        assert.equal((byGoalA.body.data as unknown[]).length, 1);

        // User scope: DISTINCT collapses the OR-join to one row per transaction.
        const byUser = await getTransactions({ session: owner.session, key: TransactionQueryTypes.USER, value: owner.user_identifier });
        assert.equal(byUser.statusCode, 200);
        assert.equal((byUser.body.data as unknown[]).length, 2);

        // Stack scope: DISTINCT now collapses the OR-join duplicates to one row per
        // transaction, so the two transfers yield 2 rows — consistent with the user
        // query.
        const byStack = await getTransactions({ session: owner.session, key: TransactionQueryTypes.STACK, value: stack.stack_identifier });
        assert.equal(byStack.statusCode, 200);
        assert.equal((byStack.body.data as unknown[]).length, 2);
    });
});

after(async () => {
    // Defer the pool-closing beforeExit so the final suite's last test has
    // settled before shutdown; emitting it synchronously races the last test.
    await new Promise((resolve) => setTimeout(resolve, 250));
    process.emit('beforeExit', 0);
});

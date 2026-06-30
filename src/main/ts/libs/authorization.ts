import type * as express from "express";
import { HTMLStatusError } from "./HTMLStatusError.ts";
import { query } from "./postgresDB.ts";
import { readSessionToken } from "./session.ts";
import { Session } from "../models/Session.ts";

/**
 * Authorization helpers built on top of session->user binding.
 *
 * `sessionAuth` already proves a valid, unexpired session exists. These helpers
 * go a step further: they resolve the *user* a session is bound to and assert
 * that user actually owns or can access the resource a request targets, instead
 * of trusting client-supplied identifiers.
 *
 * Controllers call these directly (rather than relying solely on middleware) so
 * the checks also apply to the handler-level tests that bypass Express
 * middleware.
 *
 * DEBT: substack membership is encoded as a comma-joined `users_list` TEXT
 * column, so the access checks below match it with
 * `$user = ANY(string_to_array(users_list, ','))`. A proper membership junction
 * table would let these become real joins and remove the string parsing; the
 * authorization layer leans on the existing column rather than reshaping the
 * data model here.
 */

/**
 * Resolves the user a request's session is bound to. Returns null for a valid
 * but still-anonymous session (e.g. right after `GET /api/session`, before
 * signup/login completes). Throws 403 when no session token is present at all.
 *
 * When the `sessionAuth` middleware has already run (the normal request path) it
 * has resolved the binding onto `req.authUser`, so we reuse that rather than
 * re-querying. `undefined` means the middleware did not run (e.g. handler-level
 * tests that invoke routes directly), in which case we resolve from the token.
 */
export async function getActingUser(req: express.Request): Promise<string | null> {
    if (req.authUser !== undefined) {
        return req.authUser;
    }
    const session = readSessionToken(req);
    if (!session) {
        throw new HTMLStatusError("Session ID Required", 403);
    }
    return Session.getUserForSession(session);
}

/**
 * Like {@link getActingUser} but requires the session to be bound to a user.
 * Throws 403 for anonymous sessions.
 */
export async function requireActingUser(req: express.Request): Promise<string> {
    const user = await getActingUser(req);
    if (!user) {
        throw new HTMLStatusError("Session is not associated with a user", 403);
    }
    return user;
}

/**
 * Asserts the acting user is the same user they are trying to act on / read.
 */
export function assertSelf(actingUser: string, targetUser: string | undefined | null): void {
    if (!targetUser || actingUser !== targetUser) {
        throw new HTMLStatusError("Forbidden", 403);
    }
}

/**
 * Access to a stack: the acting user owns it, or is a member of any of its
 * (non-deleted) substacks via `users_list`.
 */
export async function assertStackAccess(actingUser: string, stackIdentifier: string | undefined): Promise<void> {
    if (!stackIdentifier) {
        throw new HTMLStatusError("Stack identifier required", 400);
    }
    const rows = await query<{ ok: number }>(
        `SELECT 1 AS ok
        FROM stacks s
        WHERE s.stack_identifier = $1::uuid
            AND s.deleted = FALSE
            AND (
                s.owner_identifier = $2::uuid
                OR EXISTS (
                    SELECT 1 FROM substacks ss
                    WHERE ss.stack_identifier = s.stack_identifier
                        AND ss.deleted = FALSE
                        AND $2::text = ANY(string_to_array(ss.users_list, ','))
                )
            )
        LIMIT 1;`,
        [stackIdentifier, actingUser],
    );
    if (rows.length === 0) {
        throw new HTMLStatusError("Forbidden", 403);
    }
}

/**
 * Ownership of a stack: only the stack owner. Used for mutating a stack itself
 * and for adding substacks to it.
 */
export async function assertStackOwner(actingUser: string, stackIdentifier: string | undefined): Promise<void> {
    if (!stackIdentifier) {
        throw new HTMLStatusError("Stack identifier required", 400);
    }
    const rows = await query<{ ok: number }>(
        `SELECT 1 AS ok
        FROM stacks
        WHERE stack_identifier = $1::uuid
            AND deleted = FALSE
            AND owner_identifier = $2::uuid
        LIMIT 1;`,
        [stackIdentifier, actingUser],
    );
    if (rows.length === 0) {
        throw new HTMLStatusError("Forbidden", 403);
    }
}

/**
 * Access to a substack: the acting user owns the parent stack or is listed in
 * the substack's `users_list`.
 */
export async function assertSubstackAccess(actingUser: string, substackIdentifier: string | undefined): Promise<void> {
    if (!substackIdentifier) {
        throw new HTMLStatusError("Substack identifier required", 400);
    }
    const rows = await query<{ ok: number }>(
        `SELECT 1 AS ok
        FROM substacks ss
        JOIN stacks s ON s.stack_identifier = ss.stack_identifier
        WHERE ss.substack_identifier = $1::uuid
            AND ss.deleted = FALSE
            AND s.deleted = FALSE
            AND (
                s.owner_identifier = $2::uuid
                OR $2::text = ANY(string_to_array(ss.users_list, ','))
            )
        LIMIT 1;`,
        [substackIdentifier, actingUser],
    );
    if (rows.length === 0) {
        throw new HTMLStatusError("Forbidden", 403);
    }
}

/**
 * Access to a notification: the acting user is the recipient.
 */
export async function assertNotificationAccess(actingUser: string, notificationIdentifier: string | undefined): Promise<void> {
    if (!notificationIdentifier) {
        throw new HTMLStatusError("Notification identifier required", 400);
    }
    const rows = await query<{ ok: number }>(
        `SELECT 1 AS ok
        FROM notifications
        WHERE notification_identifier = $1::uuid
            AND deleted = FALSE
            AND notification_for = $2::uuid
        LIMIT 1;`,
        [notificationIdentifier, actingUser],
    );
    if (rows.length === 0) {
        throw new HTMLStatusError("Forbidden", 403);
    }
}

/**
 * Access to a recurring deposit: the acting user owns or is a member of the
 * destination substack's stack.
 */
export async function assertRecurringDepositAccess(actingUser: string, recurringDepositIdentifier: string | undefined): Promise<void> {
    if (!recurringDepositIdentifier) {
        throw new HTMLStatusError("Recurring deposit identifier required", 400);
    }
    const rows = await query<{ ok: number }>(
        `SELECT 1 AS ok
        FROM recurring_deposits rd
        JOIN substacks ss ON rd.to_identifier = ss.substack_identifier
        JOIN stacks s ON ss.stack_identifier = s.stack_identifier
        WHERE rd.recurring_deposit_identifier = $1::uuid
            AND rd.deleted = FALSE
            AND ss.deleted = FALSE
            AND s.deleted = FALSE
            AND (
                s.owner_identifier = $2::uuid
                OR $2::text = ANY(string_to_array(ss.users_list, ','))
            )
        LIMIT 1;`,
        [recurringDepositIdentifier, actingUser],
    );
    if (rows.length === 0) {
        throw new HTMLStatusError("Forbidden", 403);
    }
}

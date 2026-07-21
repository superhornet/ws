import type * as express from "express";
import { HTMLStatusError } from "./HTMLStatusError.ts";
import { requireActingUser } from "./authorization.ts";
import { User } from "../models/User.ts";

/**
 * Authorization for the Cybrid banking proxy.
 *
 * Every Cybrid resource (account, quote, trade, transfer, external wallet, …) is
 * owned by a *customer*. WeStack binds each user to exactly one Cybrid customer
 * (`users.cybrid_customer_guid`, set at customer creation). These helpers derive
 * the caller's customer from their session-bound user and assert that the
 * resource a request targets belongs to that customer — so a session can only
 * ever touch its own banking data, never another customer's by guessing GUIDs.
 *
 * All database access for Cybrid authorization lives here (not scattered through
 * the controller) so the enforcement is verifiable in one place.
 */

/**
 * Resolves the Cybrid customer GUID the acting user is bound to. Throws 403 when
 * the session is anonymous (no user) or the user has not created a Cybrid
 * customer yet — in both cases there is no customer to authorize against.
 */
export async function requireCustomerGuid(req: express.Request): Promise<string> {
    const actingUser = await requireActingUser(req);
    const customerGuid = await User.getCybridCustomerGuid(actingUser);
    if (!customerGuid) {
        throw new HTMLStatusError("Forbidden", 403);
    }
    return customerGuid;
}

/**
 * For `POST /cybrid/customer`: returns the acting user, but only if they do not
 * already have a Cybrid customer. Throws 403 for an anonymous session and 409
 * when the user is already bound (one customer per user).
 */
export async function requireUnboundUser(req: express.Request): Promise<string> {
    const actingUser = await requireActingUser(req);
    if (await User.getCybridCustomerGuid(actingUser)) {
        throw new HTMLStatusError("Customer already exists for this user", 409);
    }
    return actingUser;
}

/**
 * Persists the user→customer binding after a customer is created. Write-once (see
 * `User.setCybridCustomerGuid`).
 */
export async function bindCustomer(userIdentifier: string, customerGuid: string): Promise<void> {
    await User.setCybridCustomerGuid(userIdentifier, customerGuid);
}

/**
 * Asserts a target resource's `customer_guid` is the caller's own. `null`/absent
 * (e.g. a bank-owned resource, or a model that does not expose the field) is
 * treated as not-owned and denied.
 */
export function assertOwnedByCustomer(callerCustomerGuid: string, targetCustomerGuid: string | null | undefined): void {
    if (!targetCustomerGuid || targetCustomerGuid !== callerCustomerGuid) {
        throw new HTMLStatusError("Forbidden", 403);
    }
}

/**
 * For list/create inputs that carry a `customer_guid`: reject a value that is not
 * the caller's and return the caller's own guid to use instead. This both scopes
 * list queries to the caller and forces created resources onto the caller's
 * customer, so a client can never target another customer.
 */
export function requireOwnCustomerGuid(callerCustomerGuid: string, requested: string | null | undefined): string {
    if (requested && requested !== callerCustomerGuid) {
        throw new HTMLStatusError("Forbidden", 403);
    }
    return callerCustomerGuid;
}

/**
 * Fetches a customer-owned resource and asserts the caller owns it. Used where a
 * request references a resource by GUID that must be resolved to its customer
 * before proceeding — the source account of a fiat transfer, or the parent
 * quote/plan/invoice/identity-verification a create/mutate hangs off. The fetch
 * is a thunk so callers read as `assertOwns(caller, () => Cybrid.getQuote(guid))`.
 */
export async function assertOwns(
    callerCustomerGuid: string,
    fetchResource: () => Promise<{ customer_guid?: string | null }>,
): Promise<void> {
    const resource = await fetchResource();
    assertOwnedByCustomer(callerCustomerGuid, resource.customer_guid);
}

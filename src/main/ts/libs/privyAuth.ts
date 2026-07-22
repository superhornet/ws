import type * as express from "express";
import { requireActingUser } from "./authorization.ts";

/**
 * Authorization seam for the Privy wallet routes.
 *
 * Wallets are scoped to the acting user via a server-controlled `external_id`
 * (the caller's user_identifier). `requireWalletOwner` resolves that identifier
 * from the session-bound user, rejecting anonymous/unbound sessions.
 *
 * This is a thin wrapper over the shared `requireActingUser` so the controller
 * depends on a Privy-owned module that can be mocked in isolation — mocking the
 * shared `authorization` module directly would leak into every other controller's
 * tests that import it.
 */
export async function requireWalletOwner(req: express.Request): Promise<string> {
    return requireActingUser(req);
}

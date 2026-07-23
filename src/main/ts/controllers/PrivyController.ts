import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
import { Audit } from "../models/Audit.ts";
import { Privy } from "../models/Privy.ts";
import type { CreateWalletRequest, WalletChainType, WalletCreateInput, WalletListQuery } from "../types/PrivyAPITypes.ts";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
import { getSession } from "../libs/session.ts";
import { requireBody } from "../libs/requestValidation.ts";
import { requireWalletOwner } from "../libs/privyAuth.ts";

export const router = express.Router();

// --- Wallets ---
//
// Wallets are scoped to the acting user via a server-controlled `external_id`
// (the caller's user_identifier): create stamps it, list forces it, and reads
// assert it — so a session can only ever see its own wallets, never another
// user's by guessing IDs.
//
// NOTE: signing/send endpoints (sign-message, sign-transaction, send-transaction)
// are still intentionally NOT implemented. `external_id` authorizes reads only;
// before signing lands, the wallet `owner` (P-256 authorization key) must also be
// pinned to something the server controls.

router.post("/privy/wallet", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as CreateWalletRequest;
        const session = getSession(req);
        const actingUser = await requireWalletOwner(req);
        // `external_id` is server-controlled: it is the ownership tag every read
        // is scoped to, so a client-supplied `external_id`/`owner` is ignored.
        const input: WalletCreateInput = {
            chain_type: data.chain_type,
            external_id: actingUser,
            ...(data.display_name ? { display_name: data.display_name } : {}),
        };
        await Audit.logMessage("POST /api/privy/wallet", session);
        const wallet = await Privy.createWallet(input);
        JSONResponse.creationSuccess(req, res, "Wallet created", wallet as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/privy/wallet/:wallet_id", async (req, res) => {
    try {
        const session = getSession(req);
        const walletId = req.params.wallet_id;
        const actingUser = await requireWalletOwner(req);
        await Audit.logMessage(`GET /api/privy/wallet/${walletId}`, session);
        const wallet = await Privy.getWallet(walletId);
        if (wallet.external_id !== actingUser) {
            throw new HTMLStatusError("Forbidden", 403);
        }
        JSONResponse.goodToGo(req, res, "OK", wallet as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/privy/wallets", async (req, res) => {
    try {
        const session = getSession(req);
        const actingUser = await requireWalletOwner(req);
        // Always scope to the caller's own wallets; client-supplied `user_id` /
        // `external_id` filters are ignored so a session cannot list another's.
        const query: WalletListQuery = {
            external_id: actingUser,
            ...(req.query.chain_type ? { chain_type: req.query.chain_type as WalletChainType } : {}),
            ...(req.query.cursor ? { cursor: req.query.cursor as string } : {}),
            ...(req.query.limit ? { limit: Number(req.query.limit) } : {}),
        };
        await Audit.logMessage("GET /api/privy/wallets", session);
        const wallets = await Privy.listWallets(query);
        JSONResponse.goodToGo(req, res, "OK", wallets as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

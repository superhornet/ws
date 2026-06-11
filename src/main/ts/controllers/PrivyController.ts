import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
import { Audit } from "../models/Audit.ts";
import { Privy } from "../models/Privy.ts";
import type { CreateWalletRequest, WalletChainType, WalletCreateInput, WalletListQuery } from "../types/PrivyAPITypes.ts";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
import { getSession, requireSessionFromBody } from "../libs/session.ts";
import { requireBody } from "../libs/requestValidation.ts";

export const router = express.Router();

// --- Wallets ---
//
// NOTE: signing/send endpoints (sign-message, sign-transaction, send-transaction)
// are intentionally NOT implemented here. They move irreversible, uncapped value
// and must not exist until session->user binding + per-user ownership checks land

router.post("/privy/wallet", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as CreateWalletRequest;
        requireSessionFromBody(data);
        const input: WalletCreateInput = {
            chain_type: data.chain_type,
            ...(data.owner ? { owner: data.owner } : {}),
            ...(data.display_name ? { display_name: data.display_name } : {}),
            ...(data.external_id ? { external_id: data.external_id } : {}),
        };
        const wallet = await Privy.createWallet(input);
        await Audit.logMessage("POST /api/privy/wallet", data.session);
        JSONResponse.creationSuccess(req, res, "Wallet created", wallet as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/privy/wallet/:wallet_id", async (req, res) => {
    try {
        const session = getSession(req);
        const walletId = req.params.wallet_id;
        const wallet = await Privy.getWallet(walletId);
        await Audit.logMessage(`GET /api/privy/wallet/${walletId}`, session);
        JSONResponse.goodToGo(req, res, "OK", wallet as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// ACCEPTED RISK (read-only sandbox slice): with no filter this lists every
// server wallet in the app, and GET /privy/wallet/:id reads any wallet — neither
// is scoped to the caller. This is the cross-user IDOR documented
// (sessions carry no user_identifier); the per-user ownership mapping is still an
// open design item. Before this leaves sandbox, scope the query to the caller's
// own wallets (the same blocker that gates the signing/send endpoints).
router.get("/privy/wallets", async (req, res) => {
    try {
        const session = getSession(req);
        const query: WalletListQuery = {
            ...(req.query.user_id ? { user_id: req.query.user_id as string } : {}),
            ...(req.query.external_id ? { external_id: req.query.external_id as string } : {}),
            ...(req.query.chain_type ? { chain_type: req.query.chain_type as WalletChainType } : {}),
            ...(req.query.cursor ? { cursor: req.query.cursor as string } : {}),
            ...(req.query.limit ? { limit: Number(req.query.limit) } : {}),
        };
        const wallets = await Privy.listWallets(query);
        await Audit.logMessage("GET /api/privy/wallets", session);
        JSONResponse.goodToGo(req, res, "OK", wallets as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

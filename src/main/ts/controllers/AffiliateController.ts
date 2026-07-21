import * as express from "express";
import { Affiliate } from "../models/Affiliate.ts";
import type { AffiliateAPIType } from "../types/AffiliateAPITypes.ts";
import { requireBody, requireParam } from "../libs/requestValidation.ts";
import { endpoint } from "../libs/endpoint.ts";
import { requireActingUser, assertSelf } from "../libs/authorization.ts";
export const router = express.Router();

/**
 * Create an Affiliate
 */
router.post("/affiliate", (req, res) => endpoint(req, res, () => {
    requireBody(req);
    const requestBody: { data: AffiliateAPIType, message: string, session: string } = req.body;
    // Reject a malformed body (missing `data`/fields) here, during plan(), so it
    // becomes a 400 — authorize/run must never dereference an absent `data` and
    // surface a 500 instead.
    requireParam(requestBody.data?.affiliation_code, "Affiliation code");
    return {
        message: requestBody.message,
        authorize: async () => {
            const actingUser = await requireActingUser(req);
            assertSelf(actingUser, requestBody.data.referrer);
            requestBody.data.referrer = actingUser;
        },
        run: async () => ({
            status: "created",
            data: await Affiliate.connect(requestBody.data.affiliation_code, requestBody.data.referrer),
        }),
    };
}));

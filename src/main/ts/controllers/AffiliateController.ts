import * as express from "express";
import { Affiliate } from "../models/Affiliate.ts";
import type { AffiliateAPIType } from "../types/AffiliateAPITypes.ts";
import { requireBody } from "../libs/requestValidation.ts";
import { endpoint } from "../libs/endpoint.ts";
import { requireActingUser, assertSelf } from "../libs/authorization.ts";
export const router = express.Router();

/**
 * Create an Affiliate
 */
router.post("/affiliate", (req, res) => endpoint(req, res, () => {
    requireBody(req);
    const a: { data: AffiliateAPIType, message: string, session: string } = req.body;
    return {
        message: a.message,
        authorize: async () => {
            const actingUser = await requireActingUser(req);
            assertSelf(actingUser, a.data.referrer);
            a.data.referrer = actingUser;
        },
        run: async () => ({
            status: "created",
            data: await Affiliate.connect(a.data.affiliation_code, a.data.referrer),
        }),
    };
}));

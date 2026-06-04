import * as express from "express";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
import JSONResponse from "../libs/JSONResponse.ts";
import { Audit } from "../models/Audit.ts";
import { Affiliate } from "../models/Affiliate.ts";
import type { AffiliateAPIType } from "../types/AffiliateAPITypes.ts";
import { Session } from "../models/Session.ts";
export const router = express.Router();

/**
 * Create a Affiliate
 */
router.post("/affiliate", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const a: { data: AffiliateAPIType, message: string, session: string } = req.body;

        if (a.session === undefined || a.session.length === 0) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else if (await Session.exists(a.session)) {
            await Audit.logMessage(a.message, a.session);
            const affiliate = await Affiliate.connect(a.data.affiliation_code, a.data.referrer);
            JSONResponse.creationSuccess(req, res, "Created", affiliate as unknown as JSON);
        } else {
            throw new HTMLStatusError("Unauthorized", 403);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});


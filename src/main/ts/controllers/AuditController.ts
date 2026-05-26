import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
import { Audit } from "../models/Audit.ts";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
import { Session } from "../models/Session.ts";
export const router = express.Router();

router.post("/audit", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: { message: string, session: string } = req.body;
        if (await Session.exists(data.session)) {
            const audit = await Audit.logMessage(data.message, data.session);
            JSONResponse.creationSuccess(req, res, "Created", audit as unknown as JSON);
        } else {
            throw new HTMLStatusError("Unauthorized", 403);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// module.exports = router;

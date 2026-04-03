import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
import {Audit} from "../models/Audit.ts";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
export const router = express.Router();

router.post("/audit", (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }

        const data: { message: string, session: string } = req.body;
        const audit = new Audit(data.message, data.session);
        JSONResponse.creationSuccess(req, res, "Created", audit.audit() as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// module.exports = router;

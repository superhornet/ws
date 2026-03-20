import * as express from "express";
import JSONResponse from "../libs/JSONResponse.js";
import { Audit } from "../models/Audit.js";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.js";
export const router = express.Router();
router.post("/audit", (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data = req.body;
        const audit = new Audit(data.message, data.session);
        JSONResponse.creationSuccess(req, res, "Created", audit.audit());
    }
    catch (error) {
        processError(req, res, error);
    }
});
// module.exports = router;
//# sourceMappingURL=AuditController.js.map
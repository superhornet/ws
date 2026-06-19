import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
import { Audit } from "../models/Audit.ts";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
import { requireBody } from "../libs/requestValidation.ts";
import { Session } from "../models/Session.ts";
export const router = express.Router();

type AuditRequestBody = {
    session?: string;
    message?: string;
    action?: string;
    entity?: string;
    entity_identifier?: string;
    metadata?: unknown;
};

function auditMessageFromBody(data: AuditRequestBody): string {
    if (data.message) {
        return data.message;
    }

    const parts = [data.action, data.entity, data.entity_identifier].filter(Boolean);
    return parts.length > 0 ? parts.join(":") : "Audit event";
}

/**
 * Record an audit entry.
 *
 * Intentionally NOT built on the shared `endpoint` helper: writing an audit row
 * is that helper's own incidental side-effect for every other route, so routing
 * this endpoint through it would either double-log or reduce `run` to a no-op.
 * Here the audit entry IS the response payload, so the flow stays explicit.
 * `sessionAuth` already validates the session upstream; the in-handler
 * `Session.exists` check is kept as defense-in-depth for handler-level callers
 * that bypass middleware.
 */
router.post("/audit", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as AuditRequestBody;
        if (!data.session) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        if (await Session.exists(data.session)) {
            const audit = await Audit.logMessage(auditMessageFromBody(data), data.session);
            JSONResponse.creationSuccess(req, res, "Created", audit as unknown as JSON);
        } else {
            throw new HTMLStatusError("Unauthorized", 403);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// module.exports = router;

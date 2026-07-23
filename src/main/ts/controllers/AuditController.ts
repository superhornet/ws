import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
import { Audit } from "../models/Audit.ts";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
import { requireBody } from "../libs/requestValidation.ts";
import { requireActingUser } from "../libs/authorization.ts";
import { readSessionToken } from "../libs/session.ts";
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
 * `requireActingUser` re-checks it for handler-level callers that bypass
 * middleware and requires the session to be bound to a user (403 otherwise), so
 * an anonymous session cannot write audit rows.
 */
router.post("/audit", async (req, res) => {
    try {
        requireBody(req);
        const data = req.body as AuditRequestBody;
        await requireActingUser(req);
        const session = readSessionToken(req) as string;
        const audit = await Audit.logMessage(auditMessageFromBody(data), session);
        JSONResponse.creationSuccess(req, res, "Created", audit as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// module.exports = router;

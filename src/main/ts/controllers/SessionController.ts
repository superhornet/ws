import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
import { getSession } from "../libs/session.ts";
import {Session} from "../models/Session.ts";
export const router = express.Router();

router.get("/session", async (req, res) => {
    try {
        const session = await Session.create();
        JSONResponse.goodToGo(req, res, "OK", session as unknown as JSON );
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

// A real, per-session logout: deletes the session whose token the caller
// presents (X-Session), scoped to that UUID only. Formerly this pruned every
// expired row for anyone with no auth (L7); that global prune now runs as a
// background job (index.ts).
router.delete("/session", async (req, res) => {
    try{
        const session = getSession(req);
        await Session.destroy(session);
        JSONResponse.noContent(req, res, "No Content", null);
    } catch (error){
        processError(req, res, error as HTMLStatusError);
    }
});

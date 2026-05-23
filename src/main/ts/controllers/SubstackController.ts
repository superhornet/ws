import * as express from "express";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
import JSONResponse from "../libs/JSONResponse.ts";
import { getSession } from "../libs/session.ts";
import { type SubStackType, type SubStackAPIType, SubStackQueryTypes } from "../types/SubStackAPITypes.ts";
import { Audit } from "../models/Audit.ts";
import { SubStack } from "../models/SubStack.ts";

export const router = express.Router();

/**
 * Create SubStack
 */
router.post("/substack", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: SubStackAPIType = req.body;

        if (data.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else {
            const stack = new SubStack(data);
            await Audit.create(`${data.substackName} created by ${data.createdBy}`, data.session);
            JSONResponse.creationSuccess(req, res, "Created", stack as unknown as JSON);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});
/**
 * List SubStacks by Stack
 */
router.get("/substacks", async (req, res) => {
    try {
        const session = getSession(req);
        const stackIdentifier = req.query.stackIdentifier as string | undefined;
        const substackName = req.query.substackName as string | undefined;
        const createdBy = req.query.createdBy as string | undefined;
        if (!stackIdentifier && !substackName && !createdBy) {
            throw new HTMLStatusError("Missing required data", 400);
        }
        let substacks: Array<SubStackType> | undefined;
        if (stackIdentifier) {
            substacks = await SubStack.getSubStack(stackIdentifier, SubStackQueryTypes.STACKID);
        } else if (substackName) {
            substacks = await SubStack.getSubStack(substackName, SubStackQueryTypes.SUBSTACKNAME);
        } else if (createdBy) {
            substacks = await SubStack.getSubStack(createdBy, SubStackQueryTypes.OWNERID);
        }
        if (substacks !== undefined) {
            for (const key of Object.keys(substacks)) {
                const subStackKey = Number.parseInt(key);
                if (substacks[subStackKey])
                    substacks[subStackKey].usersList = [...substacks[subStackKey].usersList];
            }
        }
        await Audit.create(`Retrieving stacks for ${stackIdentifier ?? substackName ?? createdBy}`, session);
        JSONResponse.goodToGo(req, res, "OK", substacks as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});
router.put("/substack", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: SubStackAPIType = req.body;

        if (!data.session || data.session.length < 36) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else {
            SubStack.renameSubstack(Number.parseInt(req.body.id), data);
            await Audit.create(`Updating substack/ ${req.body.id}`, data.session);
            JSONResponse.updateSuccess(req, res, "Accepted", null)
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});
router.delete("/substack", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: SubStackAPIType = req.body;

        if (!data.session || data.session.length < 36) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else {
            SubStack.deleteSubstack(Number.parseInt(req.body.id), data);
            await Audit.create(`Updating substack/ ${req.body.id}`, data.session);
            JSONResponse.noContent(req, res, "No Content", null)
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

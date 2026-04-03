import * as express from "express";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
import JSONResponse from "../libs/JSONResponse.ts";
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
            JSONResponse.creationSuccess(req, res, "Created", stack as unknown as JSON);
            new Audit(`${data.substackName} created by ${data.createdBy}`, data.session);
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
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: SubStackAPIType = req.body;

        if (data.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else {
            new Audit(`Retrieving stacks for ${data.stackIdentifier}`, data.session);
            let substacks: Array<SubStackType> | undefined;
            // valid options for second parameter are 'owner-id', 'stack-id', and 'substack-name
            if (data.stackIdentifier) {
                substacks = await SubStack.getSubStack(data.stackIdentifier || "", SubStackQueryTypes.STACKID);

            } else if (data.substackName) {
                substacks = await SubStack.getSubStack(data.substackName || "", SubStackQueryTypes.SUBSTACKNAME);

            } else if (data.createdBy) {
                substacks = await SubStack.getSubStack(data.createdBy || "", SubStackQueryTypes.OWNERID);

            }
            if (substacks !== undefined) {
                for (const key of Object.keys(substacks)) {
                    //stacks[key] = stacks[key][...usersList].toString())
                    const subStackKey = Number.parseInt(key);
                    if (substacks[subStackKey])
                        substacks[subStackKey].usersList = [...substacks[subStackKey].usersList];
                }
            }
            JSONResponse.goodToGo(req, res, "OK", substacks as unknown as JSON);
        }

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

        if (data.session.length > 36) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else {
            SubStack.renameSubstack(Number.parseInt(req.body.id), data);
            JSONResponse.updateSuccess(req, res, "Accepted", null)
            new Audit(`Updating substack/ ${req.body.id}`, data.session);
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

        if (data.session.length > 36) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else {
            SubStack.deleteSubstack(Number.parseInt(req.body.id), data);
            JSONResponse.noContent(req, res, "No Content", null)
            new Audit(`Updating substack/ ${req.body.id}`, data.session);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

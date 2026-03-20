import * as express from "express";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.js";
import JSONResponse from "../libs/JSONResponse.js";
import { SubStackQueryTypes } from "../types/SubStackAPITypes.js";
import { Audit } from "../models/Audit.js";
import { SubStack } from "../models/SubStack.js";
export const router = express.Router();
/**
 * Create SubStack
 */
router.post("/substack", (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data = req.body;
        if (data.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        else {
            const stack = new SubStack(data);
            JSONResponse.creationSuccess(req, res, "Created", stack);
            new Audit(`${data.substackName} created by ${data.createdBy}`, data.session);
        }
    }
    catch (error) {
        processError(req, res, error);
    }
});
/**
 * List SubStacks by Stack
 */
router.get("/substacks", (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data = req.body;
        if (data.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        else {
            new Audit(`Retrieving stacks for ${data.stackIdentifier}`, data.session);
            let substacks;
            // valid options for second parameter are 'owner-id', 'stack-id', and 'substack-name
            if (data.stackIdentifier) {
                substacks = SubStack.getSubStack(data.stackIdentifier || "", SubStackQueryTypes.STACKID);
            }
            else if (data.substackName) {
                substacks = SubStack.getSubStack(data.substackName || "", SubStackQueryTypes.SUBSTACKNAME);
            }
            else if (data.createdBy) {
                substacks = SubStack.getSubStack(data.createdBy || "", SubStackQueryTypes.OWNERID);
            }
            if (substacks !== undefined) {
                for (const key of Object.keys(substacks)) {
                    //stacks[key] = stacks[key][...usersList].toString())
                    const subStackKey = Number.parseInt(key);
                    if (substacks[subStackKey])
                        substacks[subStackKey].usersList = [...substacks[subStackKey].usersList];
                }
            }
            JSONResponse.goodToGo(req, res, "OK", substacks);
        }
    }
    catch (error) {
        processError(req, res, error);
    }
});
router.put("/substack", (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data = req.body;
        if (data.session.length > 36) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        else {
            SubStack.rename(Number.parseInt(req.body.id), data);
            JSONResponse.updateSuccess(req, res, "Accepted", null);
            new Audit(`Updating substack/ ${req.body.id}`, data.session);
        }
    }
    catch (error) {
        processError(req, res, error);
    }
});
router.delete("/substack", (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data = req.body;
        if (data.session.length > 36) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        else {
            SubStack.delete(Number.parseInt(req.body.id), data);
            JSONResponse.noContent(req, res, "No Content", null);
            new Audit(`Updating substack/ ${req.body.id}`, data.session);
        }
    }
    catch (error) {
        processError(req, res, error);
    }
});
//# sourceMappingURL=SubstackController.js.map
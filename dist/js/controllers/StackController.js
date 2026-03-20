import * as express from "express";
import JSONResponse from "../libs/JSONResponse.js";
import { Audit } from "../models/Audit.js";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.js";
import { Stack } from "../models/Stack.js";
export const router = express.Router();
/**
 * Create a Stack
 */
router.post("/stack", (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data = req.body;
        if (data.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        else {
            const stack = new Stack(data);
            JSONResponse.creationSuccess(req, res, "Created", stack);
            new Audit(`${data.stackName} created by ${data.ownerIdentifier}.`, data.session);
        }
    }
    catch (error) {
        processError(req, res, error);
    }
});
/**
 * List a user's stacks
 */
router.get("/stacks", (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data = req.body;
        if (data.session.length < 36) {
            throw new HTMLStatusError("Session ID required", 403);
        }
        else {
            const stacks = Stack.getForUser(data.ownerIdentifier || "");
            JSONResponse.goodToGo(req, res, "OK", stacks);
            new Audit("Retrieving stacks for user", data.session);
        }
    }
    catch (error) {
        processError(req, res, error);
    }
});
/**
 * Update a stack's name
*/
router.put("/stack", (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data = req.body;
        if (data.session.length < 36) {
            throw new HTMLStatusError("Session ID required", 403);
        }
        else {
            Stack.rename(Number.parseInt(req.body.id), data);
            JSONResponse.updateSuccess(req, res, "Accepted", null);
            new Audit(`Updated stack ${req.body.id} to ${data.stackName}`, data.session);
        }
    }
    catch (error) {
        processError(req, res, error);
    }
});
/**
 * Delete a stack
 */
router.delete("/stack", (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data = req.body;
        if (data.session.length < 36) {
            throw new HTMLStatusError("Session ID required", 403);
        }
        else {
            const data = req.body;
            Stack.delete(Number.parseInt(req.body.id), data);
            //            const stacks: Array<StackType> | undefined = Stack.getForUser(data.ownerIdentifier || "");
            JSONResponse.noContent(req, res, "No Content", null);
            new Audit(`Deleted stack ${req.body.id}`, data.session);
        }
    }
    catch (error) {
        processError(req, res, error);
    }
});
//# sourceMappingURL=StackController.js.map
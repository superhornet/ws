import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
import { Audit } from "../models/Audit.ts";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
import type { StackAPIType, StackType } from "../types/StackAPITypes.ts";
import { Stack } from "../models/Stack.ts";
export const router = express.Router();

/**
 * Create a Stack
 */
router.post("/stack", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: StackAPIType = req.body;

        if (data.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else {
            const stack = new Stack(data);
            JSONResponse.creationSuccess(req, res, "Created", stack as unknown as JSON);
            new Audit(`${data.stackName} created by ${data.ownerIdentifier}.`, data.session);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

/**
 * List a user's stacks
 */
router.get("/stacks", async (req, res)=>{
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: StackAPIType = req.body;
        if(!data.session || data.session.length < 36){
            throw new HTMLStatusError("Session ID required", 403);
        }else{
            const stacks: Array<StackType> | undefined = await Stack.getForUser(data.ownerIdentifier || "");
            JSONResponse.goodToGo(req, res, "OK", stacks as unknown as JSON)
            new Audit("Retrieving stacks for user", data.session);

        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError)
    }
});

/**
 * Update a stack's name
*/
router.put("/stack", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: StackAPIType = req.body;
        if(!data.session || data.session.length < 36){
            throw new HTMLStatusError("Session ID required", 403);
        }else{
            await Stack.renameStack(Number.parseInt(req.body.id), data);
            JSONResponse.updateSuccess(req, res, "Accepted", null)
            new Audit(`Updated stack ${req.body.id} to ${data.stackName}`, data.session);

        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError)
    }
});

/**
 * Delete a stack
 */
router.delete("/stack", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data: StackAPIType = req.body;
        if(!data.session || data.session.length < 36){
            throw new HTMLStatusError("Session ID required", 403);
        }else{
            const data: StackAPIType = req.body;
            await Stack.deleteStack(Number.parseInt(req.body.id), data);
//            const stacks: Array<StackType> | undefined = Stack.getForUser(data.ownerIdentifier || "");
            JSONResponse.noContent(req, res, "No Content", null)
            new Audit(`Deleted stack ${req.body.id}`, data.session);

        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError)
    }

});

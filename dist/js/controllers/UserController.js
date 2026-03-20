import * as express from "express";
import JSONResponse from "../libs/JSONResponse.js";
import { Audit } from "../models/Audit.js";
import { User } from "../models/User.js";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.js";
export const router = express.Router();
/**
 * Create a User
 */
router.post("/user", (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data = req.body;
        if (data.session) {
            new Audit(data.message, data.session);
            const user = new User(data.firstname, data.lastname, data.email, data.city, data.state, data.level);
            JSONResponse.creationSuccess(req, res, "Created", user.toJSON());
        }
        else {
            throw new HTMLStatusError("Session ID Required", 403);
        }
    }
    catch (error) {
        processError(req, res, error);
    }
});
/**
 *
 * Read a user
 *
 * Input is the identifier passed via request body identifier
 */
router.get("/user", (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new Error("Empty JSON body");
        }
        const data = req.body;
        new Audit(`Get /api/user/${data.identifier}`, data.session);
        if (data.session) {
            const user = User.fetchById(data.identifier);
            JSONResponse.goodToGo(req, res, "OK", user);
        }
        else {
            throw new Error("Session ID Required");
        }
    }
    catch (error) {
        processError(req, res, error);
    }
});
/**
 * Update a user
 */
router.put("/user", (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data = req.body;
        new Audit(`Put /api/user/ ${data.identifier}`, data.session);
        if (data.session) {
            User.updateUser(data);
            JSONResponse.updateSuccess(req, res, "Accepted", null);
        }
        else {
            throw new Error("Session ID Required");
        }
    }
    catch (error) {
        processError(req, res, error);
    }
});
/**
 * Delete a user
 */
router.delete("/user", (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data = req.body;
        if (data.session === undefined) {
            throw new Error("Session ID Required");
        }
        else {
            new Audit(`Delete /api/user/ ${data.identifier}`, data.session);
            User.deleteUser(data);
            JSONResponse.noContent(req, res, "No Content", null);
        }
    }
    catch (error) {
        processError(req, res, error);
    }
});
//# sourceMappingURL=UserController.js.map
import * as express from "express";
import JSONResponse from "../libs/JSONResponse.js";
import { Audit } from "../models/Audit.js";
import { Notification } from "../models/Notification.js";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.js";
export const router = express.Router();
/**
 * Create a Notification
 */
router.post("/notification", (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data = req.body;
        if (data.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        else {
            new Audit(`Create notification for ${data.identifier}: ${data.message}.`, data.session);
            const notification = new Notification(data);
            JSONResponse.creationSuccess(req, res, "Created", notification);
        }
    }
    catch (error) {
        processError(req, res, error);
    }
});
router.get("/notifications", (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data = req.body;
        if (data.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        else {
            new Audit("Retrieving notifications for user", data.session);
            const notifications = Notification.getAllForUser(data.identifier || "");
            JSONResponse.goodToGo(req, res, "OK", notifications);
        }
    }
    catch (error) {
        processError(req, res, error);
    }
});
//Marks a notification as seen
router.put("/notification", (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data = req.body;
        if (data.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        else {
            new Audit(`Marking notification id: ${data.id} as seen`, data.session);
            Notification.setAsSeen(data.id || 0);
            JSONResponse.updateSuccess(req, res, "Accepted", data);
        }
    }
    catch (error) {
        processError(req, res, error);
    }
});
//Marks a notification as deleted
router.delete("/notification", (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const data = req.body;
        if (data.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        else {
            new Audit(`Marking notification ${data.id} as deleted`, data.session);
            Notification.setDeleted(data.id || 0);
            JSONResponse.noContent(req, res, "No Content", null);
        }
    }
    catch (error) {
        processError(req, res, error);
    }
});
//# sourceMappingURL=NotificationController.js.map
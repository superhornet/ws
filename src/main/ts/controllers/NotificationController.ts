import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
import { Audit } from "../models/Audit.ts";
import { Notification } from "../models/Notification.ts";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
import type { NotificationAPIType } from "../types/NotificationAPITypes.ts";
import { Session } from "../models/Session.ts";
export const router = express.Router();

/**
 * Create a Notification
 */
router.post("/notification", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const n: { data: NotificationAPIType, message: string, session: string } = req.body;

        if (n.session === undefined || n.session.length === 0) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else if (await Session.exists(n.session)) {
            await Audit.logMessage(n.message, n.session);
            const notification = await Notification.storeNotification(n.data);
            JSONResponse.creationSuccess(req, res, "Created", notification as unknown as JSON);
        } else {
            throw new HTMLStatusError("Unauthorized", 403);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

/**
 * List a user's notifications
 */
router.get("/notifications", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const n: { data: NotificationAPIType, message: string, session: string } = req.body;
        if (n.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else if (await Session.exists(n.session)) {
            Audit.logMessage(n.message, n.session);
            const notifications: Array<NotificationAPIType> = await Notification.getAllForUser(n.data.notification_for || "");
            JSONResponse.goodToGo(req, res, "OK", notifications as unknown as JSON)
        } else {
            throw new HTMLStatusError("Unauthorized", 403);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError)
    }
});
//Updates a notification
router.put("/notification", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const n: { data: NotificationAPIType, message: string, session: string } = req.body;
        if (n.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else if (await Session.exists(n.session)) {
            Audit.logMessage(n.message, n.session);
            if (await Notification.updateNotification(n.data)) {
                JSONResponse.updateSuccess(req, res, "Accepted", null)
            }
        } else {
            throw new HTMLStatusError("Unauthorized", 403);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError)
    }
});
//Marks a notification as seen
router.put("/notification/:id", async (req, res) => {
    try {
        if (!req.params.id) {
            throw new HTMLStatusError("Missing parameter", 400);
        }
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const n: { data: NotificationAPIType, message: string, session: string } = req.body;
        if (n.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else if (await Session.exists(n.session)) {
            Audit.logMessage(n.message, n.session);
            switch (req.params.id.toString()) {
                case 't':
                case '1':
                    if(await Notification.setAsSeen(n.data.note_identifier || "")){
                        JSONResponse.updateSuccess(req, res, "Accepted", null)
                    }
                    break;
                case 'f':
                case '0':
                default:
                    if(await Notification.setAsUnseen(n.data.note_identifier || "")){
                        JSONResponse.updateSuccess(req, res, "Accepted", null)
                    }
                    break;
            }
        } else {
            throw new HTMLStatusError("Unauthorized", 403);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

//Marks a notification as deleted
router.delete("/notification", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new HTMLStatusError("Empty JSON body", 400);
        }
        const n: { data: NotificationAPIType, message: string, session: string } = req.body;
        if (n.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else if (await Session.exists(n.session)) {
            Audit.logMessage(n.message, n.session);
            if (await Notification.deleteNotification(n.data.note_identifier || "")) {
                JSONResponse.noContent(req, res, "No content", null)
            }
        } else {
            throw new HTMLStatusError("Unauthorized", 403);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError)
    }
});

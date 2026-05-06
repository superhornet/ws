import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
import { Audit } from "../models/Audit.ts";
import { Notification } from "../models/Notification.ts";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
import { requireBody } from "../libs/requestValidation.ts";
import { getSession } from "../libs/session.ts";
import type { NotificationAPIType, NotificationType } from "../types/NotificationAPITypes.ts";
export const router = express.Router();

/**
 * Create a Notification
 */
router.post("/notification", async (req, res) => {
    try {
        requireBody(req);
        const data: NotificationAPIType = req.body;

        if (data.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else {
            new Audit(`Create notification for ${data.identifier}: ${data.message}.`, data.session);
            const notification = await Notification.create(data);
            JSONResponse.creationSuccess(req, res, "Created", notification as unknown as JSON);
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.get("/notifications", async (req, res) => {
    try {
        const session = getSession(req);
        const identifier = req.query.identifier as string | undefined;
        if (!identifier) {
            throw new HTMLStatusError("Missing required data", 400);
        }
        new Audit(`Retrieving notifications for user ${identifier}`, session);
        const notifications: Array<NotificationType> = await Notification.getAllForUser(identifier);
        JSONResponse.goodToGo(req, res, "OK", notifications as unknown as JSON)
    } catch (error) {
        processError(req, res, error as HTMLStatusError)
    }
});

//Marks a notification as seen
router.put("/notification/:id", async (req, res) => {
    try {
        requireBody(req);
        const data: NotificationAPIType = req.body;
        if (data.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else {
            const notificationId = Number.parseInt(req.params.id, 10);
            if (!Number.isInteger(notificationId) || notificationId <= 0) {
                throw new HTMLStatusError("Invalid notification id", 400);
            }
            new Audit(`Marking notification id: ${notificationId} as seen`, data.session);
            await Notification.setAsSeen(notificationId);
            JSONResponse.updateSuccess(req, res, "Accepted", data as JSON)
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

//Marks a notification as deleted
router.delete("/notification/:id", async (req, res) => {
    try {
        requireBody(req);
        const data: NotificationAPIType = req.body;
        if (data.session === undefined) {
            throw new HTMLStatusError("Session ID Required", 403);
        } else {
            const notificationId = Number.parseInt(req.params.id, 10);
            if (!Number.isInteger(notificationId) || notificationId <= 0) {
                throw new HTMLStatusError("Invalid notification id", 400);
            }
            new Audit(`Marking notification id: ${notificationId} as deleted`, data.session);
            await Notification.setDeleted(notificationId);
            JSONResponse.noContent(req, res, "No Content", null)
        }
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

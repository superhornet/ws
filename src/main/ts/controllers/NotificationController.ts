import * as express from "express";
import { Notification } from "../models/Notification.ts";
import { HTMLStatusError } from "../libs/HTMLStatusError.ts";
import type { NotificationAPIType } from "../types/NotificationAPITypes.ts";
import { queryOrBody, requireBody, requireParam } from "../libs/requestValidation.ts";
import { endpoint } from "../libs/endpoint.ts";
import { requireActingUser, assertSelf, assertNotificationAccess } from "../libs/authorization.ts";
export const router = express.Router();

/**
 * Create a Notification. A session may only create notifications addressed to
 * its own user.
 */
router.post("/notification", (req, res) => endpoint(req, res, () => {
    requireBody(req);
    const requestBody: { data: NotificationAPIType, message: string, session: string } = req.body;
    // Reject a malformed body (missing `data`/fields) here, during plan(), so it
    // becomes a 400 — authorize/run must never dereference an absent `data` and
    // surface a 500 instead.
    requireParam(requestBody.data?.notification_for, "Notification recipient");
    requireParam(requestBody.data?.message, "Notification message");
    return {
        message: requestBody.message,
        authorize: async () => assertSelf(await requireActingUser(req), requestBody.data.notification_for),
        run: async () => ({ status: "created", data: await Notification.storeNotification(requestBody.data) }),
    };
}));

/**
 * List a user's notifications
 */
router.get("/notifications", (req, res) => endpoint(req, res, () => {
    const notification_for = queryOrBody(
        req,
        ["notification_for", "user_identifier"],
        req.body?.data?.notification_for,
        req.body?.user_identifier,
    );
    requireParam(notification_for, "Notification recipient");
    const message = queryOrBody(req, "message", req.body?.message) ?? `List notifications for ${notification_for}`;
    return {
        message,
        authorize: async () => assertSelf(await requireActingUser(req), notification_for),
        run: async () => ({ status: "ok", data: await Notification.getAllForUser(notification_for) }),
    };
}));

/**
 * Update a notification
 */
router.put("/notification", (req, res) => endpoint(req, res, () => {
    requireBody(req);
    const requestBody: { data: NotificationAPIType, message: string, session: string } = req.body;
    requireParam(requestBody.data?.notification_for, "Notification recipient");
    requireParam(requestBody.data?.message, "Notification message");
    return {
        message: requestBody.message,
        authorize: async () => assertSelf(await requireActingUser(req), requestBody.data.notification_for),
        run: async () => {
            await Notification.updateNotification(requestBody.data);
            return { status: "accepted" };
        },
    };
}));

/**
 * Mark a notification as seen / unseen
 */
router.put("/notification/:id", (req, res) => endpoint(req, res, () => {
    if (!req.params.id) {
        throw new HTMLStatusError("Missing parameter", 400);
    }
    requireBody(req);
    const requestBody: { data: NotificationAPIType, message: string, session: string } = req.body;
    requireParam(requestBody.data?.note_identifier, "Notification identifier");
    const markSeen = req.params.id.toString() === "t" || req.params.id.toString() === "1";
    return {
        message: requestBody.message,
        authorize: async () => assertNotificationAccess(await requireActingUser(req), requestBody.data.note_identifier),
        run: async () => {
            const noteId = requestBody.data.note_identifier || "";
            if (markSeen) {
                await Notification.setAsSeen(noteId);
            } else {
                await Notification.setAsUnseen(noteId);
            }
            return { status: "accepted" };
        },
    };
}));

/**
 * Mark a notification as deleted
 */
router.delete("/notification", (req, res) => endpoint(req, res, () => {
    requireBody(req);
    const requestBody: { data: NotificationAPIType, message: string, session: string } = req.body;
    requireParam(requestBody.data?.note_identifier, "Notification identifier");
    return {
        message: requestBody.message,
        authorize: async () => assertNotificationAccess(await requireActingUser(req), requestBody.data.note_identifier),
        run: async () => {
            await Notification.deleteNotification(requestBody.data.note_identifier || "");
            return { status: "noContent" };
        },
    };
}));

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
    const n: { data: NotificationAPIType, message: string, session: string } = req.body;
    return {
        message: n.message,
        authorize: async () => assertSelf(await requireActingUser(req), n.data.notification_for),
        run: async () => ({ status: "created", data: await Notification.storeNotification(n.data) }),
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
    const n: { data: NotificationAPIType, message: string, session: string } = req.body;
    return {
        message: n.message,
        authorize: async () => assertSelf(await requireActingUser(req), n.data.notification_for),
        run: async () => {
            await Notification.updateNotification(n.data);
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
    const n: { data: NotificationAPIType, message: string, session: string } = req.body;
    const markSeen = req.params.id.toString() === "t" || req.params.id.toString() === "1";
    return {
        message: n.message,
        authorize: async () => assertNotificationAccess(await requireActingUser(req), n.data.note_identifier),
        run: async () => {
            const noteId = n.data.note_identifier || "";
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
    const n: { data: NotificationAPIType, message: string, session: string } = req.body;
    return {
        message: n.message,
        authorize: async () => assertNotificationAccess(await requireActingUser(req), n.data.note_identifier),
        run: async () => {
            await Notification.deleteNotification(n.data.note_identifier || "");
            return { status: "noContent" };
        },
    };
}));

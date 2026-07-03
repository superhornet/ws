import type { NotificationAPIType } from "../types/NotificationAPITypes.ts";
import { HTMLStatusError, as500 } from "../libs/HTMLStatusError.ts";
import { query, withTransaction } from "../libs/postgresDB.ts";
import { Validator } from "../libs/Validator.ts";

export interface INotification {
    readNotification(): NotificationAPIType;
}
export class Notification implements INotification {
    private pMessage!: NotificationAPIType;
    private get message(): NotificationAPIType | undefined {
        return this.pMessage;
    }
    private set message(value: NotificationAPIType) {
        this.pMessage = value;
    }

    private pId!: number;
    private get id() {
        return this.pId;
    }
    private set id(value) {
        this.pId = value;
    }
    constructor(
        notification: NotificationAPIType,
        id: number | bigint
    ) {
        try {
            this.message = notification;
            this.id = Number(id);
        } catch (error) {
            throw new Error((error as Error).message);
        }
    }
    /**
     * storeNotification
     */
    static async storeNotification(notification: NotificationAPIType) {
        const vMessage = new Validator({
            version: "1.0",
            stringValidation: {
                minLength: 2,
                maxLength: 2048,
                locale: "en-us",
            }
        });
        const messageChecked: boolean =
            vMessage.stringValidate(vMessage.stripHtml(notification.message));
        if (messageChecked) {
            const q = await withTransaction(async (client) => {
                return await client.query(
                    `INSERT INTO notifications (message, notification_for) VALUES( $1, $2 )
                    RETURNING id, notification_identifier, message, notification_for;`,
                    [notification.message, notification.notification_for]
                );
            });

            const row = q.rows.at(0);
            if (!row) {
                throw new HTMLStatusError("Failed to create notification", 500)
            }
            const notificationEntry = new Notification({
                message: row.message,
                notification_for: row.notification_for,
                note_identifier: row.notification_identifier
            }, row.id);
            return notificationEntry.message;
        }
        throw new HTMLStatusError("Notification message is invalid", 400);
    }
    public readNotification(): NotificationAPIType {
        return this.message as NotificationAPIType;
    }
    static async getAllForUser(user: string) {
        const output: Array<NotificationAPIType> = [];
        try {
            const fetchedNotifications = await query<NotificationAPIType>(
                `SELECT id, seen, message, notification_for, notification_identifier
                FROM notifications WHERE deleted = FALSE
                AND notification_for = $1::uuid;`,
                [user]
            )
            if (fetchedNotifications === undefined) {
                throw new HTMLStatusError("Notifications not found", 404);
            } else {
                for (const notification of fetchedNotifications) {
                    output.push({
                        message: notification.message,
                        notification_for: notification.notification_for || "",
                        note_identifier: notification.note_identifier as string,
                    })
                }
            }
            return output;
        } catch (error) {
            as500(error);
        };
    };
    static async updateNotification(notification: NotificationAPIType) {
        let isUpdated = false;
        const vMessage = new Validator({
            version: "1.0",
            stringValidation: {
                minLength: 2,
                maxLength: 2048,
                locale: "en-us",
            }
        });
        const messageChecked: boolean =
            vMessage.stringValidate(vMessage.stripHtml(notification.message));
        if (messageChecked) {
            try {
                const q = await withTransaction(async (client) => {
                    return await client.query(
                        `UPDATE notifications
                SET seen=FALSE, message=$1
                WHERE deleted = FALSE AND notification_for = $2;`,
                        [notification.message, notification.notification_for]
                    );
                });

                const rowCount = q.rowCount;
                if (rowCount === 0) {
                    throw new HTMLStatusError("Notification not updated", 404);
                } else {
                    isUpdated = true;
                }
            } catch (error) {
                as500(error);
            }
        } else {
            throw new HTMLStatusError("Notification message is invalid", 400);
        }
        return isUpdated;
    }
    static async setAsSeen(notification_identifier: string) {
        let isUpdated = false;
        try {
            const q = await withTransaction(async (client) => {
                return await client.query(
                    `UPDATE notifications
                    SET seen=TRUE
                    WHERE deleted = FALSE AND notification_identifier = $1;`,
                    [notification_identifier]
                );
            });
            const rowCount = q.rowCount;
            if (rowCount === 0) {
                throw new HTMLStatusError("Notification not updated", 404);
            } else {
                isUpdated = true;
            }
        } catch (error) {
            as500(error);
        }
        return isUpdated;
    }
    static async setAsUnseen(notification_identifier: string) {
        let isUpdated = false;
        try {
            const q = await withTransaction(async (client) => {
                return await client.query(
                    `UPDATE notifications
                    SET seen=FALSE
                    WHERE deleted = FALSE AND notification_identifier = $1;`,
                    [notification_identifier]
                );
            });
            const rowCount = q.rowCount;
            if (rowCount === 0) {
                throw new HTMLStatusError("Notification not updated", 404);
            } else {
                isUpdated = true;
            }
        } catch (error) {
            as500(error);
        }
        return isUpdated;
    }
    static async deleteNotification(notification_identifier: string) {
        let isDeleted = false;
        try {
            const q = await withTransaction(async (client) => {
                return await client.query(
                    `UPDATE notifications
                    SET deleted=TRUE
                    WHERE deleted = FALSE AND notification_identifier = $1;`,
                    [notification_identifier]
                );
            });
            const rowCount = q.rowCount;
            if (rowCount === 0) {
                throw new HTMLStatusError("Notification not deleted", 404);
            } else {
                isDeleted = true;
            }
        } catch (error) {
            as500(error);
        }
        return isDeleted;
    }
}

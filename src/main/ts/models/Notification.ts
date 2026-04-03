import type { NotificationAPIType, NotificationType } from "../types/NotificationAPITypes.ts";
import { HTMLStatusError } from "../libs/HTMLStatusError.ts";
import { query, withTransaction } from "../libs/postgresDB.js";

export class Notification {
    private _message!: string;
    private _identifier!: string;
    public get identifier() {
        return this._identifier;
    }
    public set identifier(value) {
        this._identifier = value;
    }
    constructor(data: NotificationAPIType) {
        try {
            this.message = data.message;
            this.identifier = data.identifier || "";
            this.storeNotification();

        } catch (error) {
            if (error instanceof HTMLStatusError) {
                throw error;
            } else {
                throw new HTMLStatusError((error as Error).message, 500);
            }

        }
    }
    public get message(): string {
        return this._message;
    }
    public set message(value: string) {
        this._message = value;
    }
    /**
     * storeNotification
     */
    private storeNotification() {

        withTransaction(async (client) => {
            const notificationInsert = await client.query<{ id: number }>(
                `INSERT INTO notifications (message, seen, notification_identifier) VALUES( $1 , $2 , $3 ) RETURNING id;`,
                [this.message, 'FALSE', this.identifier]
            );
            if (notificationInsert.rows.length === 0) {
                throw new HTMLStatusError("Notification creation failed", 400);
            }
        })
    }
    static async getAllForUser(data: string) {
        const output: Array<NotificationType> = [];
        try {
            const fetchedNotifications = await query<{ id: number, seen: boolean, message: string, identifier: string }>(
                `SELECT id, seen, message, notification_identifier FROM notifications WHERE deleted = FALSE AND notification_identifier = $1;`,
                [data]
            )
            if (fetchedNotifications === undefined) {
                throw new HTMLStatusError("Notifications not found", 404);
            } else {
                for (const notification of fetchedNotifications) {
                    output.push({
                        id: notification.id,
                        seen: notification.seen,
                        message: notification.message,
                        identifier: notification.identifier
                    })
                }
            }
            return output;
        } catch (error) {
            if (error instanceof HTMLStatusError) {
                throw error;
            } else {
                throw new HTMLStatusError((error as Error).message, 500);
            }
        }
    }
    static async setAsSeen(data: number) {
        const output: Array<NotificationType> = [];
        try {
            const updatedNotifications = await query(
                `UPDATE notifications set seen=TRUE WHERE deleted = FALSE AND id = $1;`,
                [data]
            )
            if (updatedNotifications) {
                for (const notification of updatedNotifications) {
                    output.push({
                        id: notification.id,
                        seen: notification.seen,
                        message: notification.message,
                        identifier: notification.identifier
                    })
                }
                return output;
            } else {
                return [];
            }

        } catch (error) {
            if (error instanceof HTMLStatusError) {
                throw error;
            } else {
                throw new HTMLStatusError((error as Error).message, 500);
            }

        }
    }
    static async setDeleted(data: number) {
        const output: Array<NotificationType> = [];
        try {
            const deletedNotifications = await query(
                `UPDATE notifications set deleted=TRUE WHERE deleted = FALSE AND id = $1;`,
                [data]
            )
            console.log(deletedNotifications);
            if (deletedNotifications) {
                for (const notification of deletedNotifications) {
                    output.push({
                        id: notification.id,
                        seen: notification.seen,
                        message: notification.message,
                        identifier: notification.identifier
                    })
                }
                return output;
            } else {
                return [];
            }
        } catch (error) {
            if (error instanceof HTMLStatusError) {
                throw error;
            } else {
                throw new HTMLStatusError((error as Error).message, 500);
            }
        }
    }
}

import type { NotificationAPIType, NotificationType } from "../types/NotificationAPITypes.ts";
import { HTMLStatusError } from "../libs/HTMLStatusError.ts";
import { query, withTransaction } from "../libs/postgresDB.ts";

export class Notification {
    private _message!: string;
    private _identifier!: string;
    public id: number = 0;
    public get identifier() {
        return this._identifier;
    }
    public set identifier(value) {
        this._identifier = value;
    }
    constructor (data: NotificationAPIType) {
        this.message = data.message;
        this.identifier = data.identifier || "";
    }
    public get message(): string {
        return this._message;
    }
    public set message(value: string) {
        this._message = value;
    }

    static async create(data: NotificationAPIType): Promise<Notification> {
        try {
            const notification = new Notification(data);
            await notification.storeNotification();
            return notification;
        } catch (error) {
            if (error instanceof HTMLStatusError) {
                throw error;
            } else {
                throw new HTMLStatusError((error as Error).message, 500);
            }
        }
    }
    /**
     * storeNotification
     */
    private async storeNotification(): Promise<void> {
        await withTransaction(async (client) => {
            const notificationInsert = await client.query<{ id: number }>(
                `INSERT INTO notifications (message, seen, notification_identifier) VALUES( $1 , $2 , $3 ) RETURNING id;`,
                [this.message, false, this.identifier]
            );
            if (notificationInsert.rows.length === 0) {
                throw new HTMLStatusError("Notification creation failed", 400);
            }
            this.id = notificationInsert.rows[0]!.id;
        })
    }
    static async getAllForUser(data: string): Promise<Array<NotificationType>> {
        try {
            const fetchedNotifications = await query<NotificationType>(
                `SELECT id, seen, message, notification_identifier AS identifier
                 FROM notifications
                 WHERE deleted = FALSE AND notification_identifier = $1;`,
                [data]
            )
            return fetchedNotifications;
        } catch (error) {
            if (error instanceof HTMLStatusError) {
                throw error;
            } else {
                throw new HTMLStatusError((error as Error).message, 500);
            }
        }
    }
    static async setAsSeen(id: number): Promise<void> {
        try {
            await query(
                `UPDATE notifications set seen=TRUE WHERE deleted = FALSE AND id = $1;`,
                [id]
            )
        } catch (error) {
            if (error instanceof HTMLStatusError) {
                throw error;
            } else {
                throw new HTMLStatusError((error as Error).message, 500);
            }
        }
    }
    static async setDeleted(id: number): Promise<void> {
        try {
            await query(
                `UPDATE notifications set deleted=TRUE WHERE deleted = FALSE AND id = $1;`,
                [id]
            )
        } catch (error) {
            if (error instanceof HTMLStatusError) {
                throw error;
            } else {
                throw new HTMLStatusError((error as Error).message, 500);
            }
        }
    }
}

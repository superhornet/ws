import dotenv from "dotenv";
import { DatabaseSync } from "node:sqlite";
import { HTMLStatusError } from "../libs/HTMLStatusError.js";
export class Notification {
    _message;
    _identifier;
    get identifier() {
        return this._identifier;
    }
    set identifier(value) {
        this._identifier = value;
    }
    constructor(data) {
        this.message = data.message;
        this.identifier = data.identifier || "";
        this.storeNotification();
    }
    get message() {
        return this._message;
    }
    set message(value) {
        this._message = value;
    }
    /**
     * storeNotification
     */
    storeNotification() {
        dotenv.config({ quiet: true });
        const environment = process.env.NODE_ENV || "production";
        try {
            const data = {
                seen: 0,
                message: this.message,
                identifier: this.identifier
            };
            if (environment === 'development') {
                const database = new DatabaseSync('westack.db');
                const result = database.prepare(`INSERT INTO notifications (message, seen, identifier) VALUES( ? , ? , ? );`).run(data.message, data.seen, data.identifier);
                database.close();
                if (result.changes === 0) {
                    throw new HTMLStatusError("Notification creation failed", 404);
                }
            }
        }
        catch (error) {
            if (error instanceof HTMLStatusError) {
                throw error;
            }
            else {
                throw new HTMLStatusError(error.message, 500);
            }
        }
    }
    static getAllForUser(data) {
        dotenv.config({ quiet: true });
        const environment = process.env.NODE_ENV || "production";
        const output = [];
        try {
            if (environment === "development") {
                const database = new DatabaseSync('westack.db');
                const fetchedNotifications = database.prepare(`SELECT id, seen, message, identifier FROM notifications WHERE deleted = 0 AND identifier = ?;`).all(data);
                database.close();
                //console.log(fetchedNotifications);
                if (fetchedNotifications === undefined) {
                    throw new HTMLStatusError("Notifications not found", 404);
                }
                else {
                    for (const notification of fetchedNotifications) {
                        output.push({
                            id: notification.id,
                            seen: notification.seen,
                            message: notification.message,
                            identifier: notification.identifier
                        });
                    }
                }
                return output;
            }
            return [];
        }
        catch (error) {
            if (error instanceof HTMLStatusError) {
                throw error;
            }
            else {
                throw new HTMLStatusError(error.message, 500);
            }
        }
    }
    static setAsSeen(data) {
        dotenv.config({ quiet: true });
        const environment = process.env.NODE_ENV || "production";
        const output = [];
        try {
            if (environment === "development") {
                const database = new DatabaseSync('westack.db');
                const updatedNotifications = database.prepare(`UPDATE notifications set seen=1 WHERE deleted = 0 AND id = ?;`).all(data);
                database.close();
                if (updatedNotifications === undefined) {
                    throw new HTMLStatusError("Notifications not found", 404);
                }
                return output;
            }
            return [];
        }
        catch (error) {
            if (error instanceof HTMLStatusError) {
                throw error;
            }
            else {
                throw new HTMLStatusError(error.message, 500);
            }
        }
    }
    static setDeleted(data) {
        dotenv.config({ quiet: true });
        const environment = process.env.NODE_ENV || "production";
        const output = [];
        try {
            if (environment === "development") {
                const database = new DatabaseSync('westack.db');
                const deletedNotifications = database.prepare(`UPDATE notifications set deleted=1 WHERE deleted = 0 AND id = ?;`).all(data);
                database.close();
                if (deletedNotifications === undefined) {
                    throw new HTMLStatusError("Notifications not found", 404);
                }
                return output;
            }
            return [];
        }
        catch (error) {
            if (error instanceof HTMLStatusError) {
                throw error;
            }
            else {
                throw new HTMLStatusError(error.message, 500);
            }
        }
    }
}
//# sourceMappingURL=Notification.js.map
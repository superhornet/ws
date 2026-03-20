import { DatabaseSync } from "node:sqlite";
import { generateUUID } from "../libs/UUID.js";
/**
 * @class Session
 * inherits from ISession
 * @author Caleb King
 * constructor takes no parameters
 * but depends upon the database
 */
export class Session {
    uuid;
    expires;
    dbID;
    /**
     * Session constructor
     */
    constructor() {
        try {
            const database = new DatabaseSync("westack.db");
            this.uuid = generateUUID();
            if (database.isOpen) {
                const sql = database.createTagStore();
                const runData = sql.run `INSERT INTO sessions (uuid) VALUES (${this.uuid})`;
                const result = sql.get `SELECT expires FROM sessions WHERE uuid = ${this.uuid}`;
                this.dbID = runData.lastInsertRowid.valueOf();
                this.expires = result?.expires?.toLocaleString();
            }
            database.close();
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    /**
     * kill() prunes expired sessions from the database
     *
     */
    kill() {
        try {
            const database = new DatabaseSync("westack.db");
            if (database.isOpen) {
                const sql = database.createTagStore();
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                sql.run `DELETE FROM sessions WHERE id in (select id from (SELECT s.id, s.expires, s.uuid,  (strftime('%s', s.expires) - strftime('%s', datetime('now'))) / 60.0 AS minutes_diff FROM SESSION s WHERE minutes_diff < 0));`;
            }
            database.close();
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    /**
     * @returns Object
     */
    session() {
        return { uuid: this.uuid, expires: this.expires, dbID: this.dbID };
    }
    /**
     * @returns string
     */
    toString() {
        return `{ uuid: '${this.uuid}', expires: '${this.expires}', dbID: ${this.dbID}}`;
    }
}
//# sourceMappingURL=Session.js.map
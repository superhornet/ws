import { DatabaseSync } from "node:sqlite";
/**
 * @class Audit
 * inherits from IAudit
 * @author Caleb King
 * @param message: string
 * @param session: string
 *
 * Depends upon the database
 */
export class Audit {
    id;
    message;
    session;
    /**
     * @param {string} message Text content of the logged message
     * @param {string} session UUID for the session which logged the entry
     *
     * Takes a message and session, stores in the
     * database along with an auto-generated timestamp
     */
    constructor(message, session) {
        try {
            const database = new DatabaseSync("westack.db");
            if (database.isOpen) {
                const sql = database.createTagStore();
                const runData = sql.run `INSERT INTO audit (message, session) VALUES (${message}, ${session})`;
                this.id = runData.lastInsertRowid.valueOf();
                this.message = message;
                this.session = session;
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
    audit() {
        return { id: this.id, message: this.message, session: this.session };
    }
    /**
     * @returns string
     */
    toString() {
        return `{ id: ${this.id}, message: '${this.message}', session: '${this.session}'}`;
    }
}
//# sourceMappingURL=Audit.js.map
import { HTMLStatusError } from "../libs/HTMLStatusError.ts";
import { withTransaction } from "../libs/postgresDB.ts"
import { Validator } from "../libs/Validator.ts";

/**
 * Audit interface definition
 * No outside interface
 */
export interface IAudit {
    audit(): Promise<{ message: string }|undefined>;
}

/**
 * @class Audit
 * inherits from IAudit
 * @author Caleb King
 * @param message: string
 * @param session: string
 *
 * Depends upon the database
 */
export class Audit implements IAudit {
    private readonly message: string;

    /**
     * @param {string} message Text content of the logged message
     * @param {string} session UUID for the session which logged the entry
     *
     * Takes a message and session, stores in the
     * database along with an auto-generated timestamp
     */
    constructor(message: string) {
        try {
            this.message = message;
        } catch (error) {
            throw new Error((error as Error).message);
        }
    }
    static async logMessage(message: string, session: string): Promise<{ message: string; } | undefined> {
        const v = new Validator({
            version: "1.0",
            stringValidation: {
                minLength: 2,
                maxLength: 512,
                locale: "en-us",
            }
        });
        if (v.stringValidate(v.stripHtml(message))) {
            const q = await withTransaction(async (client) => {
                return client.query(
                    `INSERT INTO audit (message, session, type) VALUES ($1, $2, $3) RETURNING message;`,
                    [v.stripHtml(message), session, 'info']
                )
            });
            const row = q.rows.at(0);
            if (!row) {
                throw new HTMLStatusError("Failed to write to audit log", 500);
            }
            const auditEntry = new Audit(row.message);
            return auditEntry.audit();
        }
        return undefined;
    }
    /**
     * @returns Object
     */
    public async audit(): Promise<{message: string}> {
        return {message: this.message};
    }
}

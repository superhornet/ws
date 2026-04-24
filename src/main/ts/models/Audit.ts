import { withTransaction} from "../libs/postgresDB.ts"

/**
 * Audit interface definition
 */
export interface IAudit {
    /** database id of the Audit entry */
    id: number|bigint;
    /** message text */
    message: string;
    /** session text is a UUID */
    session: string;
    audit(): {id: number|bigint; message: string; session: string};
    toString(): string;
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
    public id!: number|bigint;
    public message!: string;
    public session!: string;

    /**
     * @param {string} message Text content of the logged message
     * @param {string} session UUID for the session which logged the entry
     *
     * Takes a message and session, stores in the
     * database along with an auto-generated timestamp
     */
    constructor(message: string, session: string) {
        try {
            this.message = Audit.sanitize(message);
            this.session = session;
            this.logMessage();
        } catch (error) {
            throw new Error((error as Error).message);
        }
    }
    /**
     * Neutralize log-injection: strip C0/C1 control chars (incl. CR/LF) so
     * attacker-controlled substrings can't forge extra log lines, and cap
     * length so an oversized payload can't flood the audit table.
     */
    static sanitize(message: string): string {
        const maxLength = 512;
        // eslint-disable-next-line no-control-regex
        const stripped = message.replace(/[\x00-\x1F\x7F-\x9F]/g, " ");

        return stripped.length > maxLength ? stripped.slice(0, maxLength) : stripped;
    }
    private logMessage() {
        withTransaction(async (client) => {
            await client.query(
                `INSERT INTO audit (message, session) VALUES ($1, $2)`,
                [this.message, this.session]
            )
        });
    }
    /**
     * @returns Object
     */
    public audit(): { id: number|bigint; message: string; session: string} {
        return { id: this.id, message: this.message, session: this.session};
    }

    /**
     * @returns string
     */
    public toString(): string {
        return `{ id: ${this.id}, message: '${this.message}', session: '${this.session}'}`;
    }
}

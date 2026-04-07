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
            this.message = message;
            this.session = session;
            this.logMessage();
        } catch (error) {
            throw new Error((error as Error).message);
        }
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

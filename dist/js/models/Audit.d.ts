/**
 * Audit interface definition
 */
export interface IAudit {
    /** database id of the Audit entry */
    id: number | bigint;
    /** message text */
    message: string;
    /** session text is a UUID */
    session: string;
    audit(): {
        id: number | bigint;
        message: string;
        session: string;
    };
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
export declare class Audit implements IAudit {
    id: number | bigint;
    message: string;
    session: string;
    /**
     * @param {string} message Text content of the logged message
     * @param {string} session UUID for the session which logged the entry
     *
     * Takes a message and session, stores in the
     * database along with an auto-generated timestamp
     */
    constructor(message: string, session: string);
    /**
     * @returns Object
     */
    audit(): {
        id: number | bigint;
        message: string;
        session: string;
    };
    /**
     * @returns string
     */
    toString(): string;
}
//# sourceMappingURL=Audit.d.ts.map
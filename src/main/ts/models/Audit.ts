import { HTMLStatusError } from "../libs/HTMLStatusError.ts";
import { withTransaction } from "../libs/postgresDB.ts"
import { Validator } from "../libs/Validator.ts";

/**
 * Audit interface definition
 * No outside interface
 */
export interface IAudit {
    audit(): Promise<{ message: string }>;
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

    /** Bounds for the stored audit message (matches the historical validator policy). */
    private static readonly MIN_MESSAGE_LENGTH = 2;
    private static readonly MAX_MESSAGE_LENGTH = 512;
    /** Substituted when the caller-supplied message is empty/too short after sanitizing. */
    private static readonly FALLBACK_MESSAGE = "(no message)";

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

    /**
     * Sanitize and clamp a caller-supplied audit message into the stored range.
     *
     * Auditing must be guaranteed: an authorized action always produces exactly
     * one audit row, and the (often client-supplied) message text must never be
     * able to *suppress* that row. So instead of rejecting an out-of-range
     * message, we strip HTML, then clamp it — truncating when too long and
     * substituting a safe placeholder when empty/too short — so the insert always
     * has a valid value.
     */
    private static normalizeMessage(message: string): string {
        // Only `stripHtml` is needed here; it ignores Validator options, and the
        // 2..512 range is enforced explicitly below.
        const v = new Validator();
        // stripHtml can expand input (e.g. "&" -> "{ampersand}"), so clamp after.
        const sanitized = typeof message === "string" ? v.stripHtml(message).trim() : "";
        const clamped = sanitized.slice(0, Audit.MAX_MESSAGE_LENGTH);
        return clamped.length >= Audit.MIN_MESSAGE_LENGTH ? clamped : Audit.FALLBACK_MESSAGE;
    }

    static async logMessage(message: string, session: string): Promise<{ message: string; }> {
        const safeMessage = Audit.normalizeMessage(message);
        const q = await withTransaction(async (client) => {
            return client.query(
                `INSERT INTO audit (message, session, type) VALUES ($1, $2, $3) RETURNING message;`,
                [safeMessage, session, 'info']
            )
        });
        const row = q.rows.at(0);
        if (!row) {
            throw new HTMLStatusError("Failed to write to audit log", 500);
        }
        const auditEntry = new Audit(row.message);
        return auditEntry.audit();
    }
    /**
     * @returns Object
     */
    public async audit(): Promise<{message: string}> {
        return {message: this.message};
    }
}

import { HTMLStatusError, as500 } from "../libs/HTMLStatusError.ts";
import { query } from "../libs/postgresDB.ts"

/**
 * @class Session
 * @author Caleb King
 * A collection of static helpers over the `sessions` table.
 */
export class Session {
    static async create(): Promise<{ uuid: string; expires: string }> {
        try {
            const rows = await query<{ uuid: string; expires: string }>(
                `INSERT INTO sessions DEFAULT VALUES RETURNING uuid, expires;`
            );
            const row = rows.at(0);
            if (!row) {
                throw new HTMLStatusError("Failed to store session", 500);
            }
            return row;
        } catch (error) {
            as500(error);
        }
    }
    /**
     * kill() prunes expired sessions from the database. Invoked by a background
     * job at boot (see index.ts), not by a public HTTP route — the old
     * DELETE /api/session that triggered it exposed a destructive verb to
     * unauthenticated callers (L7).
     */
    static async kill(): Promise<void> {
        try {
            await query(
                `DELETE FROM sessions WHERE expires < NOW();`,
                []
            )
        } catch (error) {
            as500(error);
        }
    }
    /**
     * Deletes a single session by its UUID — a real, per-session logout. Scoped
     * to the token the caller presents, so it can only revoke their own session
     * (L7). Idempotent: deleting an unknown or already-expired UUID is a no-op.
     */
    static async destroy(session: string): Promise<void> {
        try {
            await query(
                `DELETE FROM sessions WHERE uuid = $1;`,
                [session]
            );
        } catch (error) {
            as500(error);
        }
    }
    /**
     * exists
     */
    static async exists(session: string): Promise<boolean> {
        if (session?.length !== 36) {
            return false;
        }
        try {
            const rows = await query<{ ok: number }>(
                `SELECT 1 AS ok FROM sessions WHERE uuid = $1 AND expires > NOW();`,
                [session]
            );
            return rows.length > 0;
        } catch (error) {
            as500(error);
        }
    }
    /**
     * Binds a session to the user it has authenticated as (after signup or a
     * login OTP). Once bound, authorization can derive the acting user from the
     * session instead of trusting client-supplied identifiers.
     */
    static async bindUser(session: string, userIdentifier: string): Promise<void> {
        if (session?.length !== 36) {
            throw new HTMLStatusError("Invalid session", 400);
        }
        try {
            const updated = await query<{ uuid: string }>(
                `UPDATE sessions
                SET user_identifier = $2
                WHERE uuid = $1 AND expires > NOW()
                RETURNING uuid;`,
                [session, userIdentifier],
            );
            if (updated.length === 0) {
                throw new HTMLStatusError("Session not found", 404);
            }
        } catch (error) {
            as500(error);
        }
    }

    /**
     * Returns the user_identifier a session is bound to, or null when the
     * session is anonymous (not yet through signup/login) or expired/missing.
     */
    static async getUserForSession(session: string | undefined): Promise<string | null> {
        if (!session || session.length !== 36) {
            return null;
        }
        try {
            const rows = await query<{ user_identifier: string | null }>(
                `SELECT user_identifier FROM sessions WHERE uuid = $1 AND expires > NOW();`,
                [session],
            );
            return rows.at(0)?.user_identifier ?? null;
        } catch (error) {
            as500(error);
        }
    }
}


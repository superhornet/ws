import { randomInt } from "node:crypto";
import { HTMLStatusError, as500 } from "../libs/HTMLStatusError.ts";
import { query, withTransaction } from "../libs/postgresDB.ts"

/**
 * Session interface definition
 */
export interface ISession {
    session(): Promise<{ uuid: string; expires: string; otp: string }>;
    toString(): string;
}

/**
 * @class Session
 * inherits from ISession
 * @author Caleb King
 * constructor takes no parameters
 * but depends upon the database
 */
export class Session implements ISession {
    private uuid = "";
    private readonly otp: string;
    private expires = "";
    private dbID: number | bigint = -1;
    /**
     * Session constructor
     */
    constructor() {
        try {
            this.otp = this.generateOTP();
        } catch (error) {
            throw new Error((error as Error).message);
        }
    }

    static async create() {
        const session = new Session();
        await session.storeSession();
        return session.session();
    }

    private async storeSession(): Promise<void> {
        const q = await withTransaction(async (client) => {
            return client.query<{ id: number, expires: string, uuid: string }>(
                'INSERT INTO sessions (otp) VALUES ($1) RETURNING id, otp, expires, uuid',
                [this.otp]
            );
        });

        const row = q.rows.at(0);
        if (!row) {
            throw new HTMLStatusError("Failed to store session", 500);
        }

        this.dbID = row.id;
        this.expires = row.expires;
        this.uuid = row.uuid;
    }
    /**
     * kill() prunes expired sessions from the database
     *
     */
    static kill() {
        return (async () => {
            await query(
                `DELETE FROM sessions WHERE expires < NOW();`,
                []
            )
        });
    }
    /**
     * exists
     */
    static async exists(session: string): Promise<boolean> {
        if(session?.length !== 36){
            return false;
        }
        try {
            const fetchedSession = await query<{ id: number }>(
                `SELECT * FROM sessions WHERE uuid = $1 AND expires > NOW();`,
                [session]
            )
            if (fetchedSession.length === 0) {
                return false;
            } else {
                return true;
            }
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
            const updated = await query<{ id: number }>(
                `UPDATE sessions
                SET user_identifier = $2
                WHERE uuid = $1 AND expires > NOW()
                RETURNING id;`,
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
    /**
     * @returns Object
     */
    public async session(): Promise<{ uuid: string; expires: string; otp: string; }> {
        try {
            const fetchedSession = await query<{ uuid: string, expires: string, otp: string }>(
                `SELECT uuid, expires, otp FROM sessions WHERE id = $1;`,
                [this.dbID]
            )
            const row = fetchedSession.at(0);
            if(row){
                return row;
            }else{
                throw new HTMLStatusError("Session not found.", 404);
            }
        } catch (error) {
            as500(error);
        }
    };
    /**
     * @returns string
     */
    public toString(): string {
        return `{ uuid: '${this.uuid}', expires: '${this.expires}', dbID: ${this.dbID}}`;
    }

    private generateOTP(): string {
        const legalChars: string = "0123456789ABCDEFGHIJKLMNPQRSTUVWXYZ";
        const otpLength: number = 6;
        let otp = "";

        for (let i = 0; i < otpLength; i++) {
            otp += legalChars.charAt(randomInt(legalChars.length));
        }
        return otp;
    }
}


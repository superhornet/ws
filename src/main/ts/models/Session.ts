import { randomInt } from "node:crypto";
import { query, withTransaction} from "../libs/postgresDB.ts"
import { generateUUID } from "../libs/UUID.ts";

/**
 * Session interface definition
 */
export interface ISession {
    uuid: string;
    otp: string;
    expires?: string;
    dbID: number|bigint;
    session(): {uuid: string; expires: string; otp: string};
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
    public uuid!: string;
    public otp!: string;
    public expires!: string;
    public dbID!: number|bigint;

    /**
     * Session constructor
     */
    constructor() {
        try {
            this.uuid = generateUUID();
            this.otp = this.generateOTP();
            this.storeSession();

        } catch (error) {
            throw new Error((error as Error).message);
        }
    }
    private storeSession() {
        withTransaction(async (client) => {
            const sessionInsert = await client.query<{id: number, expires: string}>(
                'INSERT INTO sessions (uuid, otp) VALUES ($1, $2) RETURNING id, expires',
                [this.uuid, this.otp]
            )
            this.dbID = sessionInsert.rows[0]!.id;
            this.expires = sessionInsert.rows[0]!.expires;
        })
    }
    /**
     * kill() prunes expired sessions from the database
     *
     */
    static async kill(): Promise<void> {
        try {
            await query(
                `DELETE FROM sessions WHERE expires < NOW();`,
                []
            )
        } catch (error) {
            throw new Error((error as Error).message);
        }
    }
    /**
     * @returns Object
     */
    public session(): { uuid: string; expires: string; dbID: number|bigint; otp: string} {
        return { uuid: this.uuid, expires: this.expires, dbID: this.dbID, otp: this.otp};
    }
    /**
     * @returns string
     */
    public toString(): string {
        return `{ uuid: '${this.uuid}', expires: '${this.expires}', dbID: ${this.dbID}}`;
    }

    private generateOTP(): string {
        const legalChars : string = "0123456789ABCDEFGHIJKLMNPQRSTUVWXYZ";
        const otpLength: number = 6;
        let otp = "";

        for (let i = 0; i < otpLength; i++) {
            otp += legalChars.charAt(randomInt(legalChars.length));
        }
        return otp;
    }
}


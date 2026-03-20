/**
 * Session interface definition
 */
export interface ISession {
    uuid: string;
    expires?: string;
    dbID: number | bigint;
    session(): {
        uuid: string;
        expires: string;
    };
    toString(): string;
}
/**
 * @class Session
 * inherits from ISession
 * @author Caleb King
 * constructor takes no parameters
 * but depends upon the database
 */
export declare class Session implements ISession {
    uuid: string;
    expires: string;
    dbID: number | bigint;
    /**
     * Session constructor
     */
    constructor();
    /**
     * kill() prunes expired sessions from the database
     *
     */
    kill(): void;
    /**
     * @returns Object
     */
    session(): {
        uuid: string;
        expires: string;
        dbID: number | bigint;
    };
    /**
     * @returns string
     */
    toString(): string;
}
//# sourceMappingURL=Session.d.ts.map
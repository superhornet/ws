import { generateUUID } from "../libs/UUID.ts";
import { SubscriptionType, type SubscriptionEnum } from "../types/SubscriptionTypes.ts";
import { HTMLStatusError } from "../libs/HTMLStatusError.ts";
import type { UserAPIType } from "../types/UserAPITypes.ts";
import { query, withTransaction } from "../libs/postgresDB.ts";
export interface FetchedUser {
    id: number;
    email: string;
    firstname: string;
    lastname: string;
    identifier: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    level: SubscriptionEnum;
}

export interface TUser {
    firstname: string;
    lastname: string;
    email: string;
    emailID: string;
    emailHost: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    level: SubscriptionEnum;
    /** identifier is uuid */
    identifier: string;
}

export interface TUserConfig {
    /** foreign key uuid */
    forUser: string;

}
/**
 * User interface definition
 */
export interface IUser {
    _User: TUser;
    _UserConfig: TUserConfig;
}

type CreateUserInput = Pick<TUser, "firstname"|"lastname"|"email"|"address1"|"address2"|"city"|"state"> & { level: string };

export class User implements IUser {
    private static readonly allowedLevels: ReadonlySet<SubscriptionEnum> = new Set([
        SubscriptionType.FREE,
        SubscriptionType.BASIC,
        SubscriptionType.PRO,
    ]);

    private static isSubscriptionEnum(value: string): value is SubscriptionEnum {
        return (User.allowedLevels as ReadonlySet<string>).has(value);
    }

    private get User(): IUser | undefined {
        return this.userObj;
    }
    private set User(value: IUser | undefined) {
        this.userObj = value;
    }
    public _User!: TUser;
    public _UserConfig!: TUserConfig;
    private userObj: IUser | undefined;
    private id!: number;
    private constructor(
        user1: CreateUserInput
    ) {
        const { firstname, lastname, email, address1, address2, city, state } = user1;
        const [userid, hostname] = email.split("@");
        const level = user1.level || SubscriptionType.FREE;
        if (!User.isSubscriptionEnum(level)) {
            throw new HTMLStatusError("Missing JSON Data", 400);
        }

        const user: TUser = {
            firstname, lastname, email,
            emailID: userid || "",
            emailHost: hostname || "",
            address1, address2, city, state, level,
            identifier: generateUUID(),
        };
        this.User = {
            _User: user,
            _UserConfig: {
                forUser: user.identifier
            }
        };
    }

    static async create(
        user1: CreateUserInput
    ): Promise<User> {
        const user = new User(user1);
        await user.storeUser();
        return user;
    }
    public toJSON() {
        const { address1, address2, city, email, emailHost, emailID, firstname, identifier, lastname, state, level } = this.User!._User;
        return { address1, address2, city, email, emailHost, emailID, firstname, id: this.id, identifier, lastname, state, level };
    }
    private async storeUser(): Promise<void> {
        const { email, emailHost, emailID, firstname, lastname, identifier, address1, address2, city, state, level } = this.User!._User;
        await withTransaction(async (client) => {
            const userInsert = await client.query<{ id: number }>(
                `INSERT INTO users (email,emailHost,emailID,firstname,lastname,user_identifier,address1,address2,city,state,level) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
                [email, emailHost, emailID, firstname, lastname, identifier, address1, address2, city, state, level],
            );
            if (userInsert.rows.length === 0) {
                throw new HTMLStatusError("User creation failed", 400);
            }
            this.id = userInsert.rows[0]!.id;
        });
    }
    static async fetchById(userid: string): Promise<FetchedUser> {
        try {
            const fetchedUser = await query<{ id: number; email: string;
                firstname: string; lastname: string; user_identifier: string;
                address1: string; address2: string; city: string; state: string;
                level: string }>(
                `SELECT id, email, firstname, lastname, user_identifier, address1, address2, city, state, level FROM users WHERE user_identifier = $1 AND deleted = FALSE;`,
                [userid]
            )
            const row = fetchedUser[0];
            if (!row) {
                throw new HTMLStatusError("User was not found", 404);
            }
            const { id, email, firstname, lastname, user_identifier: identifier, address1, address2, city, state, level } = row;
            if (!User.isSubscriptionEnum(level)) {
                throw new HTMLStatusError("Internal Server Error", 500);
            }
            return { id, email, firstname, lastname, identifier, address1, address2, city, state, level };
        } catch (error) {
            if (error instanceof HTMLStatusError) {
                throw error;
            } else {
                throw new HTMLStatusError("Internal Server Error", 500);
            }
        }
    }
    static async updateUser(data: UserAPIType) {
        try {
            const requiredFields = ["identifier", "firstname", "lastname", "email",
                                    "address1", "city", "state", "level"] as const;
            const hasMissing = requiredFields.some(
                (fieldName) => data[fieldName] === undefined || data[fieldName] === "",
            );
            if (hasMissing) {
                throw new HTMLStatusError("Missing JSON Data", 400);
            }
            const [userid, hostname] = data.email.split("@");
            if (!userid || !hostname) {
                throw new HTMLStatusError("Missing JSON Data", 400);
            }
            if (!User.isSubscriptionEnum(data.level)) {
                throw new HTMLStatusError("Missing JSON Data", 400);
            }

            const result = await query(
                `UPDATE users SET email=$1, emailID=$2, emailhost=$3, firstname=$4, lastname=$5, address1=$6, address2=$7, city=$8, state=$9, level=$10 WHERE user_identifier = $11 RETURNING user_identifier`,
                [data.email, userid, hostname, data.firstname, data.lastname, data.address1, data.address2 ?? "", data.city, data.state, data.level, data.identifier]
            )
            if (result.length === 0) {
                throw new HTMLStatusError("User not found", 404);
            }
        } catch (error) {
            if (error instanceof HTMLStatusError) {
                throw error;
            }
            throw new HTMLStatusError("Internal Server Error", 500);
        }
    }
    static async deleteUser(data: UserAPIType) {
        try {
            if (data.identifier === undefined) {
                throw new HTMLStatusError("Missing JSON Data", 400);
            }
            const result = await query(
                `UPDATE users SET deleted=TRUE WHERE user_identifier = $1 RETURNING user_identifier`,
                [data.identifier]
            )
            if (result.length === 0) {
                throw new HTMLStatusError("User not found", 404);
            }
        } catch (error) {
            if (error instanceof HTMLStatusError) {
                throw error;
            }
            throw new HTMLStatusError("Internal Server Error", 500);
        }
    }
}

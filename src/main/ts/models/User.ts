import { generateUUID } from "../libs/UUID.ts";
import { SubscriptionType, type SubscriptionEnum } from "../types/SubscriptionTypes.ts";
import { HTMLStatusError } from "../libs/HTMLStatusError.ts";
import type { UserAPIType } from "../types/UserAPITypes.ts";
import { query, withTransaction } from "../libs/postgresDB.ts";
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
    subscriptionLevel: string;
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

export class User implements IUser {
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
        user1: Pick<TUser, "firstname"|"lastname"|"email"|"address1"|"address2"|"city"|"state"|"subscriptionLevel">
    ) {
        const [userid, hostname] = user1.email.split("@");

        const user: TUser = {
            firstname: user1.firstname,
            lastname: user1.lastname,
            email: user1.email,
            emailID: userid || "",
            emailHost: hostname || "",
            address1: user1.address1,
            address2: user1.address2,
            city: user1.city,
            state: user1.state,
            subscriptionLevel: user1.subscriptionLevel || SubscriptionType.FREE,
            identifier: generateUUID()
        };
        this.User = {
            _User: user,
            _UserConfig: {
                forUser: user.identifier
            }
        };
    }

    static async create(
        user1: Pick<TUser, "firstname"|"lastname"|"email"|"address1"|"address2"|"city"|"state"|"subscriptionLevel">
    ): Promise<User> {
        const user = new User(user1);
        await user.storeUser();
        return user;
    }
    public toJSON() {
        const data = this.User?._User as TUser;
        return {
            address1: data.address1,
            address2: data.address2,
            city: data.city,
            email: data.email,
            emailHost: data.emailHost,
            emailID: data.emailID,
            firstname: data.firstname,
            id: this.id,
            identifier: data.identifier,
            lastname: data.lastname,
            state: data.state,
            subscriptionLevel: data.subscriptionLevel,
        };
    }
    private async storeUser(): Promise<void> {
        const data = this.User?._User as TUser;
        await withTransaction(async (client) => {
            const userInsert = await client.query<{ id: number }>(
                `INSERT INTO users (email,emailHost,emailID,firstname,lastname,user_identifier,address1,address2,city,state,level) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
                [
                    data.email,
                    data.emailHost,
                    data.emailID,
                    data.firstname,
                    data.lastname,
                    data.identifier,
                    data.address1,
                    data.address2,
                    data.city,
                    data.state,
                    data.subscriptionLevel
                ]
            );
            if (userInsert.rows.length === 0) {
                throw new HTMLStatusError("User creation failed", 400);
            }
            this.id = userInsert.rows[0]!.id;
        });
    }
    static async fetchById(userid: string) {
        let user:{ id: number; email: string;
                firstname: string; lastname: string; identifier: string;
                address1: string; address2: string; city: string; state: string;
                level: SubscriptionEnum };
        try {

            const fetchedUser = await query<{ id: number; email: string;
                firstname: string; lastname: string; user_identifier: string;
                address1: string; address2: string; city: string; state: string;
                level: SubscriptionEnum }>(
                `SELECT id, email, firstname, lastname, user_identifier, address1, address2, city, state, level FROM users WHERE user_identifier = $1 AND deleted = FALSE;`,
                [userid]
            )
            if (fetchedUser[0]) {
                user = {
                    id: fetchedUser[0].id,
                    email: fetchedUser[0].email,
                    firstname: fetchedUser[0].firstname,
                    lastname: fetchedUser[0].lastname,
                    identifier: fetchedUser[0].user_identifier,
                    address1: fetchedUser[0].address1,
                    address2: fetchedUser[0].address2,
                    city: fetchedUser[0].city,
                    state: fetchedUser[0].state,
                    level: fetchedUser[0].level
                }
            } else {
                throw new HTMLStatusError("User was not found", 404);
            }
            return user;
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

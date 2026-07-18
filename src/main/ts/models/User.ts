import { HTMLStatusError, as500 } from "../libs/HTMLStatusError.ts";
import type { UserAPIType } from "../types/UserAPITypes.ts";
import { query, withTransaction } from "../libs/postgresDB.ts";
import { Validator } from "../libs/Validator.ts";
import { randomInt } from "node:crypto";
export interface IUser {
    //storeUser(): Promise<void>;
    readUser(): UserAPIType;
    //fetchByUuid(user_identifier: string): Promise<UserAPIType>;
    //updateUser();
    //deleteUser();
}
export class User implements IUser {
    private pUser!: UserAPIType;
    private get user(): UserAPIType | undefined {
        return this.pUser;
    }
    private set user(value: UserAPIType) {
        this.pUser = value;
    }

    private pId!: number | bigint;
    private get id(): number | bigint {
        return this.pId;
    }
    private set id(value: number) {
        this.pId = value;
    }

    constructor(
        user: UserAPIType,
        id: number | bigint
    ) {
        try {
            this.user = user;
            this.id = Number(id);
        } catch (error) {
            throw new Error((error as Error).message);
        }
    }

    /**
     * Rejects a payload whose required string fields are missing or not strings,
     * before any of them are dereferenced (`email.split`, `stripHtml`, …), so a
     * malformed body yields a 400 rather than a TypeError-driven 500. The message
     * stays generic: validation errors must not name fields.
     */
    private static assertUserShape(user: UserAPIType | undefined): asserts user is UserAPIType {
        const requiredStrings = [
            user?.email,
            user?.firstname,
            user?.lastname,
            user?.address1,
            user?.address2,
            user?.city,
            user?.state,
        ];
        if (requiredStrings.some((field) => typeof field !== "string")) {
            throw new HTMLStatusError("User fields are invalid", 400);
        }
    }

    static async storeUser(user: UserAPIType, verifiedPhone?: string | null) {
        User.assertUserShape(user);
        const vName = new Validator({
            version: "1.0",
            stringValidation: {
                minLength: 2,
                maxLength: 48,
                locale: "en-us"
            }
        });
        const vEmail = new Validator({
            version: "1.0",
            emailValidation: {
                domainMinLength: 5,
                domainMaxLength: 36,
            },
            stringValidation: {
                minLength: 3,
                maxLength: 128
            }
        });
        const vAddress = new Validator({
            version: "1.0",
            stringValidation: {
                minLength: 0,
                maxLength: 64,
                locale: "en-us"
            }
        });

        const [userid, hostname] = user.email.split("@");
        const emailChecked: boolean = (
            vEmail.emailValidate(user.email) &&
            vEmail.stringValidate(vEmail.stripHtml(userid as string)) &&
            vEmail.stringValidate(vEmail.stripHtml(hostname as string)));
        const nameChecked: boolean = (
            vName.stringValidate(vName.stripHtml(user.firstname)) &&
            vName.stringValidate(vName.stripHtml(user.lastname)));
        const addressChecked: boolean = (
            vAddress.stringValidate(vAddress.stripHtml(user.address1)) &&
            vAddress.stringValidate(vAddress.stripHtml(user.address2)) &&
            vAddress.stringValidate(vAddress.stripHtml(user.city)) &&
            vAddress.stringValidate(vAddress.stripHtml(user.state)));
        if (emailChecked && nameChecked && addressChecked) {
            const queryResult = await withTransaction(async (client) => {
                return await client.query(
                    `INSERT INTO users (email,email_host,emailid,
                    firstname,lastname,affiliate,
                    address1,address2,city,state,zipcode,
                    subscription_level,phone_e164) VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    RETURNING id, user_identifier, firstname, lastname, affiliate,
                    email, phone_e164, address1, address2, city, state, zipcode, subscription_level`,
                    [
                        user.email,
                        vEmail.stripHtml(hostname as string),
                        vEmail.stripHtml(userid as string),
                        vName.stripHtml(user.firstname),
                        vName.stripHtml(user.lastname),
                        User.generateAffiliate(7),
                        vAddress.stripHtml(user.address1),
                        vAddress.stripHtml(user.address2),
                        vAddress.stripHtml(user.city),
                        vAddress.stripHtml(user.state),
                        user.zipcode,
                        user.subscription_level,
                        verifiedPhone ?? null
                    ]
                );
            });

            const row = queryResult.rows.at(0);
            if (!row) {
                throw new HTMLStatusError("Failed to create user.", 500)
            }
            const userEntry = new User({
                firstname: row.firstname,
                lastname: row.lastname,
                email: row.email,
                phone_e164: row.phone_e164,
                address1: row.address1,
                address2: row.address2,
                city: row.city,
                state: row.state,
                zipcode: row.zipcode,
                subscription_level: row.subscription_level,
                user_identifier: row.user_identifier,
                affiliate: row.affiliate
            }, row.id);
            return userEntry.readUser();
        }
        throw new HTMLStatusError("User fields are invalid", 400);
    }
    public readUser(): UserAPIType {
        return this.user as UserAPIType;
    }
    static async fetchByUuid(user_identifier: string): Promise<UserAPIType> {
        try {
            const fetchedUser = await query<UserAPIType>(
                `SELECT user_identifier, firstname, lastname, affiliate, email, phone_e164,
                    address1, address2, city, state, zipcode, subscription_level
                    FROM users WHERE user_identifier = $1 AND deleted = FALSE;`,
                [user_identifier]
            )
            const row = fetchedUser.at(0);
            if (row) {
                return row
            } else {
                throw new HTMLStatusError("User not found", 404);
            }
        } catch (error) {
            as500(error);
        }
    };
    static async findIdentifierByPhone(phone: string): Promise<string | null> {
        try {
            const fetchedUser = await query<{ user_identifier: string }>(
                `SELECT user_identifier
                FROM users
                WHERE phone_e164 = $1 AND deleted = FALSE
                ORDER BY id
                LIMIT 1;`,
                [phone]
            );
            return fetchedUser.at(0)?.user_identifier ?? null;
        } catch (error) {
            as500(error);
        }
    }
    static async updateUser(user: UserAPIType) {
        User.assertUserShape(user);
        let isUpdated = false;
        const vName = new Validator({
            version: "1.0",
            stringValidation: {
                minLength: 2,
                maxLength: 48,
                locale: "en-us"
            }
        });
        const vEmail = new Validator({
            version: "1.0",
            emailValidation: {
                domainMinLength: 5,
                domainMaxLength: 36,
            },
            stringValidation: {
                minLength: 5,
                maxLength: 128
            }
        });
        const vAddress = new Validator({
            version: "1.0",
            stringValidation: {
                minLength: 0,
                maxLength: 64,
                locale: "en-us"
            }
        });

        const [userid, hostname] = user.email.split("@");
        const emailChecked: boolean = (
            vEmail.emailValidate(user.email) &&
            vEmail.stringValidate(vEmail.stripHtml(userid as string)) &&
            vEmail.stringValidate(vEmail.stripHtml(hostname as string)));
        const nameChecked: boolean = (
            vName.stringValidate(vName.stripHtml(user.firstname)) &&
            vName.stringValidate(vName.stripHtml(user.lastname)));
        const addressChecked: boolean = (
            vAddress.stringValidate(vAddress.stripHtml(user.address1)) &&
            vAddress.stringValidate(vAddress.stripHtml(user.address2)) &&
            vAddress.stringValidate(vAddress.stripHtml(user.city)) &&
            vAddress.stringValidate(vAddress.stripHtml(user.state)));
        if (emailChecked && nameChecked && addressChecked) {
            try {
                const queryResult = await withTransaction(async (client) => {
                    return await client.query(
                        `UPDATE users SET (email,email_host,emailid,
                    firstname,lastname,
                    address1,address2,city,state,zipcode,
                    subscription_level) =
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    where user_identifier = $12`,
                        [
                            user.email,
                            vEmail.stripHtml(hostname as string),
                            vEmail.stripHtml(userid as string),
                            vName.stripHtml(user.firstname),
                            vName.stripHtml(user.lastname),
                            vAddress.stripHtml(user.address1),
                            vAddress.stripHtml(user.address2),
                            vAddress.stripHtml(user.city),
                            vAddress.stripHtml(user.state),
                            user.zipcode,
                            user.subscription_level,
                            user.user_identifier
                        ])
                });

                const rowCount = queryResult.rowCount;
                if (rowCount === 0) {
                    throw new HTMLStatusError("User not updated", 404);
                } else {
                    isUpdated = true;
                }
            } catch (error) {
                as500(error);
            }
        } else {
            throw new HTMLStatusError("User fields are invalid", 400);
        }
        return isUpdated;
    }
    static async deleteUser(user_identifier: string) {
        let isDeleted = false;
        try {
            const queryResult = await withTransaction(async (client) => {
                return await client.query(
                    `UPDATE users SET deleted=TRUE WHERE user_identifier = $1`,
                    [user_identifier]
                )
            });
            const rowCount = queryResult.rowCount;
            if (rowCount === 0) {
                throw new HTMLStatusError("User not found", 404);
            } else {
                isDeleted = true;
            }
        } catch (error) {
            as500(error);
        }
        return isDeleted
    }
    static generateAffiliate(size_t: number): string {
        const legalChars: string = "0123456789ABCDEFGHIJKLMNPQRSTUVWXYZ";
        let code = "";

        for (let index = 0; index < size_t; index++) {
            code += legalChars.charAt(randomInt(legalChars.length));
        }
        return code;
    }
}


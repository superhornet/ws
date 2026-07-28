import { HTMLStatusError, as500 } from "../libs/HTMLStatusError.ts";
import type { UserAPIType } from "../types/UserAPITypes.ts";
import { query } from "../libs/postgresDB.ts";
import { Validator } from "../libs/Validator.ts";
import { randomInt } from "node:crypto";

export class User {
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

    /**
     * Validates the user's string fields and returns their sanitized
     * (stripHtml'd) values ready for persistence, throwing a generic 400 if any
     * field fails validation. `email` is returned raw (only the local/host parts
     * are stripped), matching the existing INSERT/UPDATE column mapping.
     * `emailMinLength` is the only knob that differs between create and update.
     */
    private static sanitizeUserFields(user: UserAPIType, emailMinLength: number) {
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
                minLength: emailMinLength,
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
        const emailid = vEmail.stripHtml(userid as string);
        const email_host = vEmail.stripHtml(hostname as string);
        const firstname = vName.stripHtml(user.firstname);
        const lastname = vName.stripHtml(user.lastname);
        const address1 = vAddress.stripHtml(user.address1);
        const address2 = vAddress.stripHtml(user.address2);
        const city = vAddress.stripHtml(user.city);
        const state = vAddress.stripHtml(user.state);

        const emailChecked: boolean = (
            vEmail.emailValidate(user.email) &&
            vEmail.stringValidate(emailid) &&
            vEmail.stringValidate(email_host));
        const nameChecked: boolean = (
            vName.stringValidate(firstname) &&
            vName.stringValidate(lastname));
        const addressChecked: boolean = (
            vAddress.stringValidate(address1) &&
            vAddress.stringValidate(address2) &&
            vAddress.stringValidate(city) &&
            vAddress.stringValidate(state));
        if (!emailChecked || !nameChecked || !addressChecked) {
            throw new HTMLStatusError("User fields are invalid", 400);
        }

        return { email: user.email, email_host, emailid, firstname, lastname, address1, address2, city, state };
    }

    static async storeUser(user: UserAPIType, verifiedPhone?: string | null) {
        User.assertUserShape(user);
        const fields = User.sanitizeUserFields(user, 3);

        const rows = await query<UserAPIType>(
            `INSERT INTO users (email, email_host, emailid,
                firstname, lastname, affiliate,
                address1, address2, city, state, zipcode,
                phone_e164)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING user_identifier, firstname, lastname, affiliate,
                email, phone_e164, address1, address2, city, state, zipcode, subscription_level;`,
            [
                fields.email,
                fields.email_host,
                fields.emailid,
                fields.firstname,
                fields.lastname,
                User.generateAffiliate(7),
                fields.address1,
                fields.address2,
                fields.city,
                fields.state,
                user.zipcode,
                verifiedPhone ?? null,
            ],
        );

        const row = rows.at(0);
        if (!row) {
            throw new HTMLStatusError("Failed to create user.", 500);
        }
        return row;
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

    /**
     * Returns the Cybrid customer GUID this user is bound to, or `null` when the
     * user has not yet created a Cybrid customer. Used to authorize `/api/cybrid/*`
     * requests against the acting user instead of trusting client-supplied GUIDs.
     */
    static async getCybridCustomerGuid(userIdentifier: string): Promise<string | null> {
        try {
            const rows = await query<{ cybrid_customer_guid: string | null }>(
                `SELECT cybrid_customer_guid FROM users WHERE user_identifier = $1 AND deleted = FALSE;`,
                [userIdentifier],
            );
            return rows.at(0)?.cybrid_customer_guid ?? null;
        } catch (error) {
            as500(error);
        }
    }

    /**
     * Binds a Cybrid customer to this user. The `cybrid_customer_guid IS NULL`
     * guard makes this write-once: a user can never rebind to a different customer,
     * and a concurrent double-create resolves to a single 409 rather than two
     * bindings. Throws 409 when the user already has a customer.
     */
    static async setCybridCustomerGuid(userIdentifier: string, customerGuid: string): Promise<void> {
        try {
            const updated = await query<{ id: number }>(
                `UPDATE users SET cybrid_customer_guid = $2
                WHERE user_identifier = $1 AND deleted = FALSE AND cybrid_customer_guid IS NULL
                RETURNING id;`,
                [userIdentifier, customerGuid],
            );
            if (updated.length === 0) {
                throw new HTMLStatusError("Customer already exists for this user", 409);
            }
        } catch (error) {
            as500(error);
        }
    }

    static async updateUser(user: UserAPIType): Promise<void> {
        User.assertUserShape(user);
        const fields = User.sanitizeUserFields(user, 5);
        try {
            const updated = await query<{ user_identifier: string }>(
                `UPDATE users SET
                    (email, email_host, emailid, firstname, lastname,
                    address1, address2, city, state, zipcode)
                    = ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    WHERE user_identifier = $11
                    RETURNING user_identifier;`,
                [
                    fields.email,
                    fields.email_host,
                    fields.emailid,
                    fields.firstname,
                    fields.lastname,
                    fields.address1,
                    fields.address2,
                    fields.city,
                    fields.state,
                    user.zipcode,
                    user.user_identifier,
                ],
            );
            if (updated.length === 0) {
                throw new HTMLStatusError("User not updated", 404);
            }
        } catch (error) {
            as500(error);
        }
    }

    static async deleteUser(user_identifier: string): Promise<void> {
        try {
            const deleted = await query<{ user_identifier: string }>(
                `UPDATE users SET deleted = TRUE
                    WHERE user_identifier = $1
                    RETURNING user_identifier;`,
                [user_identifier],
            );
            if (deleted.length === 0) {
                throw new HTMLStatusError("User not found", 404);
            }
        } catch (error) {
            as500(error);
        }
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


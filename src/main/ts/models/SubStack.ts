import { HTMLStatusError, as500 } from "../libs/HTMLStatusError.ts";
import { SubStackQueryTypes, type SubStackAPIType, type SubStackLookup } from "../types/SubStackAPITypes.ts";
import { query, withTransaction } from "../libs/postgresDB.ts";
import { Validator } from "../libs/Validator.ts";

/**
 * Normalizes the various representations `users_list` can take (a comma-joined
 * string from the database, a `Set`, or an already-parsed array) into a clean
 * `string[]`. Always returns an array, even for a single user, so the API never
 * leaks a bare string to clients.
 */
export function normalizeUsersList(value: unknown): string[] {
    let candidates: string[];
    if (Array.isArray(value)) {
        candidates = value.map((entry) => String(entry));
    } else if (value instanceof Set) {
        candidates = Array.from(value, (entry) => String(entry));
    } else if (typeof value === "string") {
        candidates = value.split(",");
    } else {
        return [];
    }
    return candidates.map((entry) => entry.trim()).filter((entry) => entry.length > 0);
}

export interface ISubStack {
    readSubstack(): SubStackAPIType
}
export class SubStack {
    private pSubstack!: SubStackAPIType;
    private get substack(): SubStackAPIType {
        return this.pSubstack;
    }
    private set substack(value: SubStackAPIType) {
        this.pSubstack = value;
    }
    private pId!: number;
    private get id() {
        return this.pId;
    }
    private set id(value) {
        this.pId = value;
    }
    constructor(
        substack: SubStackAPIType,
        id: number | bigint
    ) {
        try {
            this.substack = substack;
            this.id = Number(id);
        } catch (error) {
            throw new Error((error as Error).message);
        }
    }
    static async storeSubStack(substack: SubStackAPIType) {
        const vSubStack = new Validator({ //Validator for SubStack Name
            version: "1.0",
            stringValidation: {
                minLength: 4,
                maxLength: 100,
                locale: "en-us",
            }
        });
        const nameChecked: boolean =
            vSubStack.stringValidate(vSubStack.stripHtml(substack.substack_name));
        if (nameChecked) {
            try {
                const stackRows = await query<{ created_by: number, stack_identifier: string, owner_identifier: string }>(`
                    SELECT created_by, stack_identifier, owner_identifier FROM stacks WHERE stack_identifier = $1 ORDER BY id LIMIT 1;`,
                    [substack.stack_identifier]);
                let created_by: number;
                let stack_ident: string;
                const owner_ident = new Set<string>();
                for (const result of stackRows) {
                    created_by = result.created_by;
                    stack_ident = result.stack_identifier;
                    owner_ident.add(result.owner_identifier);
                }
                const queryResult = await withTransaction(async (client) => {
                    return await client.query(
                        `INSERT INTO substacks (substack_name, stack_identifier, balance, created_by, users_list, goal_amount, goal_deadline )
                        VALUES (
                            $1, $2, $3, $4, $5, $6, $7
                        )
                        RETURNING id, substack_name, substack_identifier, stack_identifier, balance, users_list, goal_amount, goal_deadline, created_at, updated_at;`,
                        [
                            substack.substack_name,
                            stack_ident,
                            substack.balance,
                            created_by,
                            Array.from(owner_ident).toString(),
                            substack.goal_amount ?? null,
                            substack.goal_deadline ?? null,
                        ]
                    )
                });
                const row = queryResult.rows.at(0);
                if (!row) {
                    throw new HTMLStatusError("Failed to create substack", 500);
                }
                const subStackEntry = new SubStack({
                    substack_name: row.substack_name,
                    substack_identifier: row.substack_identifier,
                    stack_identifier: row.stack_identifier,
                    balance: row.balance,
                    users_list: normalizeUsersList(row.users_list),
                    goal_amount: row.goal_amount ?? null,
                    goal_deadline: row.goal_deadline ?? null,
                    created_at: row.created_at ?? null,
                    updated_at: row.updated_at ?? null,
                }, row.id);
                return subStackEntry.substack;
            } catch (error) {
                as500(error);
            }
        }
        throw new HTMLStatusError("SubStack fields are invalid", 400);
    }
    public readSubStack(): SubStackAPIType {
        return this.substack;
    }
    static async getSubStack(type: string, substack: SubStackLookup) {
        const output: Array<SubStackAPIType> = [];
        try {
            let fetchedSubstacks;
            switch (type) {
                case SubStackQueryTypes.STACKID:
                    fetchedSubstacks = query<SubStackAPIType>(
                        `SELECT substack_name, substack_identifier, stack_identifier, balance, users_list, goal_amount, goal_deadline, created_at, updated_at FROM substacks WHERE deleted = FALSE AND stack_identifier = $1::uuid ORDER BY created_at DESC;`,
                        [substack.stack_identifier]
                    );
                    break;
                case SubStackQueryTypes.OWNERID:
                    fetchedSubstacks = query<SubStackAPIType>(
                        `SELECT s.owner_identifier, ss.substack_name, ss.substack_identifier, ss.stack_identifier, ss.balance, ss.users_list, ss.goal_amount, ss.goal_deadline, ss.created_at, ss.updated_at FROM stacks AS s INNER JOIN substacks AS ss ON s.stack_identifier = ss.stack_identifier WHERE POSITION(owner_identifier::text IN users_list) > 0 AND s.owner_identifier = $1::uuid ORDER BY ss.created_at DESC`,
                        [substack.owner_identifier]

                    );
                    break;
                case SubStackQueryTypes.SUBSTACKNAME:
                    fetchedSubstacks = query<SubStackAPIType>(
                        `SELECT substack_name, substack_identifier, stack_identifier, balance, users_list, goal_amount, goal_deadline, created_at, updated_at FROM substacks WHERE deleted = FALSE AND substack_name = $1 ORDER BY created_at DESC;`,
                        [substack.substack_name]

                    );
                    break;
            }
            if (fetchedSubstacks === undefined) {
                throw new HTMLStatusError("Substack not found", 404);
            } else {
                for (const substack of await fetchedSubstacks) {
                    output.push({
                        balance: substack.balance,
                        stack_identifier: substack.stack_identifier,
                        substack_name: substack.substack_name,
                        substack_identifier: substack.substack_identifier,
                        users_list: normalizeUsersList(substack.users_list),
                        goal_amount: substack.goal_amount ?? null,
                        goal_deadline: substack.goal_deadline ?? null,
                        created_at: substack.created_at ?? null,
                        updated_at: substack.updated_at ?? null,
                    })
                }
            }
            return output;
        } catch (error) {
            as500(error);
        }
    }
    static async renameSubstack(substack: SubStackAPIType) {
        let isUpdated = false;
        const vSubStack = new Validator({ //Validator for SubStack Name
            version: "1.0",
            stringValidation: {
                minLength: 4,
                maxLength: 100,
                locale: "en-us",
            }
        });
        const nameChecked: boolean =
            vSubStack.stringValidate(vSubStack.stripHtml(substack.substack_name));
        if (nameChecked) {
            try {
                const queryResult = await withTransaction(async (client) => {
                    const users = normalizeUsersList(substack.users_list);

                    return await client.query(
                        `UPDATE substacks
                        SET substack_name = $1,
                            users_list = $2,
                            goal_amount = COALESCE($3, goal_amount),
                            goal_deadline = COALESCE($4, goal_deadline),
                            updated_at = NOW()
                        WHERE deleted = FALSE AND substack_identifier = $5;`,
                        [
                            substack.substack_name,
                            users.toString(),
                            substack.goal_amount ?? null,
                            substack.goal_deadline ?? null,
                            substack.substack_identifier,
                        ]
                    );
                });
                const rowCount = queryResult.rowCount;
                if (rowCount === 0) {
                    throw new HTMLStatusError("Substack Not Found", 404);
                } else {
                    isUpdated = true;
                }
            } catch (error) {
                as500(error);
            }
        } else {
            throw new HTMLStatusError("Substack name is invalid", 400);
        }
        return isUpdated;
    }
    static async deleteSubstack(substack: SubStackAPIType) {
        let isDeleted = false;
        try {
            const queryResult = await withTransaction(async (client) => {
                return await client.query(
                    `UPDATE substacks set deleted = TRUE WHERE deleted = FALSE AND substack_identifier = $1;`,
                    [substack.substack_identifier]
                );
            });
            const rowCount = queryResult.rowCount;
            if (rowCount === 0) {
                throw new HTMLStatusError("Substack Not Found", 404);
            } else {
                isDeleted = true;
            }
        } catch (error) {
            as500(error);
        }
        return isDeleted;
    }
    static async getParentStack(substack_identifier: string) {
        let parentStackID: string = '';
        try {
            const substacks = await query<SubStackAPIType>(
                `SELECT DISTINCT stack_identifier FROM substacks WHERE substack_identifier = $1;`,
                [substack_identifier]
            );
            for(const stack of substacks){
                parentStackID = stack.stack_identifier;
            }
        } catch (error) {
            as500(error);
        }
        return parentStackID;
    }
    static async getUsersList(substack_identifier: string) {
        const substackUsers= new Set<string>;
        try {
            const substacks = await query<SubStackAPIType>(
                `SELECT users_list FROM substacks WHERE substack_identifier = $1;`,
                [substack_identifier]
            );
            for(const substack of substacks){
                for(const user of normalizeUsersList(substack.users_list)){
                    substackUsers.add(user);
                }
            }
        } catch (error) {
            as500(error);
        }
        return substackUsers;
    }
}

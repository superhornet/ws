import { HTMLStatusError } from "../libs/HTMLStatusError.ts";
import { SubStackQueryTypes, type SubStackAPIType } from "../types/SubStackAPITypes.ts";
import { query, withTransaction } from "../libs/postgresDB.ts";
import { Validator } from "../libs/Validator.ts";
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
                const r = await query<{ created_by: number, stack_identifier: string, owner_identifier: string }>(`
                    SELECT created_by, stack_identifier, owner_identifier FROM stacks WHERE stack_identifier = $1 ORDER BY id LIMIT 1;`,
                    [substack.stack_identifier]);
                let created_by: number;
                let stack_ident: string;
                const owner_ident = new Set<string>();
                for (const result of r) {
                    created_by = result.created_by;
                    stack_ident = result.stack_identifier;
                    owner_ident.add(result.owner_identifier);
                }
                const q = await withTransaction(async (client) => {
                    return await client.query(
                        `INSERT INTO substacks (substack_name, stack_identifier, created_by, users_list )
                        VALUES (
                            $1, $2, $3, $4
                        )
                        RETURNING id, substack_name, substack_identifier, stack_identifier, balance, users_list;`,
                        [substack.substack_name, stack_ident, created_by, Array.from(owner_ident).toString()]
                    )
                });
                const row = q.rows.at(0);
                if (!row) {
                    throw new HTMLStatusError("Failed to create substack", 500);
                }
                const subStackEntry = new SubStack({
                    substack_name: row.substack_name,
                    substack_identifier: row.substack_identifier,
                    stack_identifier: row.stack_identifier,
                    balance: row.balance,
                    users_list: row.users_list
                }, row.id);
                return subStackEntry.substack;
            } catch (error) {
                throw new Error((error as Error).message);
            }
        }
        return undefined;
    }
    public readSubStack(): SubStackAPIType {
        return this.substack;
    }
    static async getSubStack(type: string, substack: SubStackAPIType) {
        const output: Array<SubStackAPIType> = [];
        try {
            let fetchedSubstacks;
            switch (type) {
                case SubStackQueryTypes.STACKID:
                    fetchedSubstacks = query<SubStackAPIType>(
                        `SELECT substack_name, substack_identifier, stack_identifier, balance, users_list FROM substacks WHERE deleted = FALSE AND stack_identifier = $1;`,
                        [substack.stack_identifier]
                    );
                    break;
                case SubStackQueryTypes.OWNERID:
                    fetchedSubstacks = query<SubStackAPIType>(
                        `SELECT s.owner_identifier, ss.substack_name, ss.substack_identifier, ss.stack_identifier, ss.balance, ss.users_list FROM stacks AS s INNER JOIN substacks AS ss ON s.stack_identifier = ss.stack_identifier WHERE POSITION(owner_identifier::text IN users_list) > 0 AND s.owner_identifier = $1`,
                        [substack.owner_identifier]

                    );
                    break;
                case SubStackQueryTypes.SUBSTACKNAME:
                    fetchedSubstacks = query<SubStackAPIType>(
                        `SELECT substack_name, substack_identifier, stack_identifier, balance, users_list FROM substacks WHERE deleted = FALSE AND substack_name = $1;`,
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
                        users_list: substack.users_list
                    })
                }
            }
            return output;
        } catch (error) {
            if (error instanceof HTMLStatusError) {
                throw error;
            } else {
                throw new HTMLStatusError((error as Error).message, 500);
            }
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
                const q = await withTransaction(async (client) => {
                    const users = new Set<string>(substack.users_list);

                    return await client.query(
                        `UPDATE substacks set substack_name= $1 , users_list= $2 WHERE deleted = FALSE AND substack_identifier = $3;`,
                        [substack.substack_name, Array.from(users).toString(), substack.substack_identifier]
                    );
                });
                const rowCount = q.rowCount;
                if (rowCount === 0) {
                    throw new HTMLStatusError("Substack Not Found", 404);
                } else {
                    isUpdated = true;
                }
            } catch (error) {
                if (error instanceof HTMLStatusError) {
                    throw error;
                } else {
                    throw new HTMLStatusError((error as Error).message, 500);
                }
            }
        }
        return isUpdated;
    }
    static async deleteSubstack(substack: SubStackAPIType) {
        let isDeleted = false;
        try {
            const q = await withTransaction(async (client) => {
                return await client.query(
                    `UPDATE substacks set deleted = TRUE WHERE deleted = FALSE AND substack_identifier = $1;`,
                    [substack.substack_identifier]
                );
            });
            const rowCount = q.rowCount;
            if (rowCount === 0) {
                throw new HTMLStatusError("Substack Not Found", 404);
            } else {
                isDeleted = true;
            }
        } catch (error) {
            if (error instanceof HTMLStatusError) {
                throw error;
            } else {
                throw new HTMLStatusError((error as Error).message, 500);
            }
        }
        return isDeleted;
    }
    static async getBalance(substack_identifier: string) {
        let balance = undefined;
        try {
            const fetchedBalance = await query<SubStackAPIType>(
                `SELECT balance FROM substacks WHERE substack_identifier = $1;`,
                [substack_identifier]
            );
            for(const balances in fetchedBalance){
                balance = Number.parseInt(balances)/100;
            }
        } catch (error) {
            if (error instanceof HTMLStatusError) {
                throw error;
            } else {
                throw new HTMLStatusError((error as Error).message, 500);
            }
        }
        return balance;
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
            if (error instanceof HTMLStatusError) {
                throw error;
            } else {
                throw new HTMLStatusError((error as Error).message, 500);
            }
        }
        return parentStackID;
    }
}

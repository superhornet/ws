import type { StackAPIType } from "../types/StackAPITypes.ts";
import { HTMLStatusError } from "../libs/HTMLStatusError.ts";
import { query, withTransaction } from "../libs/postgresDB.ts";
import { Validator } from "../libs/Validator.ts";

export interface IStack {
    readStack(): StackAPIType;
}
export class Stack implements IStack {
    private pStack!: StackAPIType;
    private get stack(): StackAPIType {
        return this.pStack;
    }
    private set stack(value: StackAPIType) {
        this.pStack = value;
    }
    private pId!: number;
    private get id() {
        return this.pId;
    }
    private set id(value) {
        this.pId = value
    }
    constructor(
        stack: StackAPIType,
        id: number | bigint
    ) {
        try {
            this.stack = stack;
            this.id = Number(id);
        } catch (error) {
            throw new Error((error as Error).message);
        }
    }
    /**
     * storeStack
     */
    static async storeStack(stack: StackAPIType) {
        const vStack = new Validator({ //Validator for Stack Name
            version: "1.0",
            stringValidation: {
                minLength: 4,
                maxLength: 100,
                locale: "en-us",
            }
        });
        const nameChecked: boolean =
            vStack.stringValidate(vStack.stripHtml(stack.stack_name));
        if (nameChecked) {
            try {
                const r = await query<{id: number, user_identifier: string}>(`SELECT id, user_identifier FROM users WHERE user_identifier = $1 ORDER BY id LIMIT 1;`, [stack.owner_identifier]);
                let id: number;
                let user_ident: string;
                for (const result of r) {
                    id = result.id;
                    user_ident = result.user_identifier;
                }
                const q = await withTransaction(async (client) => {
                    return await client.query(
                        `INSERT INTO stacks ( owner_identifier, stack_name, created_by )
                    VALUES (
                        $1, $2, $3
                    )
                    RETURNING id, stack_name, stack_identifier, owner_identifier`,
                        [user_ident, vStack.stripHtml(stack.stack_name), id]);
                });
                const row = q.rows.at(0);
                if (!row) {
                    throw new HTMLStatusError("Failed to create stack", 500);
                }
                const stackEntry = new Stack({
                    stack_name: row.stack_name,
                    stack_identifier: row.stack_identifier,
                    owner_identifier: row.owner_identifier
                }, row.id);
                return stackEntry.stack;
            } catch (error) {
                throw new Error((error as Error).message)
            }
        }
        return undefined;
    }
    public readStack(): StackAPIType {
        return this.stack;
    }
    /**
     * getForUser
     */
    static async getForUser(user: string) {//: StackType[] | undefined
        const output: Array<StackAPIType> = [];
        try {
            const fetchedStacks = await query<StackAPIType>(
                `SELECT
                id, stack_name, stack_identifier, owner_identifier
                FROM stacks WHERE deleted = FALSE AND owner_identifier = $1;`,
                [user]
            )
            if (fetchedStacks === undefined) {
                throw new HTMLStatusError("Stacks not found", 404);
            } else {
                for (const stack of fetchedStacks) {
                    output.push({
                        stack_name: stack.stack_name,
                        stack_identifier: stack.stack_identifier,
                        owner_identifier: stack.owner_identifier,
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
    static async updateStack(stack: StackAPIType) {
        let isUpdated = false;
        const vStack = new Validator({ //Validator for Stack Name
            version: "1.0",
            stringValidation: {
                minLength: 4,
                maxLength: 100,
                locale: "en-us",
            }
        });
        const nameChecked: boolean =
            vStack.stringValidate(vStack.stripHtml(stack.stack_name));
        if (nameChecked) {
            try {
                const q = await withTransaction(async (client) => {
                    return await client.query(
                        `UPDATE stacks
                    SET stack_name = $1
                    WHERE deleted = FALSE AND stack_identifier = $2;`,
                        [vStack.stripHtml(stack.stack_name), stack.stack_identifier]);
                });
                const rowCount = q.rowCount;
                if (rowCount === 0) {
                    throw new HTMLStatusError("Stack not updated", 404);
                } else {
                    isUpdated = true;
                }
            } catch (error) {
                throw new HTMLStatusError((error as Error).message, 500);
            }
        }
        return isUpdated;
    }
    static async deleteStack(stack_identifier: string) {
        let isDeleted = false;
        try {
            const q = await withTransaction(async (client) => {
                return await client.query(
                    `UPDATE stacks
                    SET deleted=TRUE
                    WHERE deleted = FALSE AND stack_identifier = $1;`,
                    [stack_identifier]);
            });
            const rowCount = q.rowCount;
            if (rowCount === 0) {
                throw new HTMLStatusError("Stack not deleted", 404);
            } else {
                isDeleted = true;
            }
        } catch (error) {
            throw new HTMLStatusError((error as Error).message, 500);
        }
        return isDeleted;
    }
}

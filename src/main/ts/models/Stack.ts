import type { StackAPIType, StackMemberAPIType } from "../types/StackAPITypes.ts";
import { HTMLStatusError, as500 } from "../libs/HTMLStatusError.ts";
import { query, withTransaction } from "../libs/postgresDB.ts";
import { Validator } from "../libs/Validator.ts";
import { normalizeUsersList } from "./SubStack.ts";

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
                        `INSERT INTO stacks ( owner_identifier, stack_name, created_by, goal_amount, goal_deadline, category, emoji )
                    VALUES (
                        $1, $2, $3, $4, $5, $6, $7
                    )
                    RETURNING id, stack_name, stack_identifier, owner_identifier, goal_amount, goal_deadline, category, emoji, created_at, updated_at`,
                        [
                            user_ident,
                            vStack.stripHtml(stack.stack_name),
                            id,
                            stack.goal_amount ?? null,
                            stack.goal_deadline ?? null,
                            stack.category ?? null,
                            stack.emoji ?? null,
                        ]);
                });
                const row = q.rows.at(0);
                if (!row) {
                    throw new HTMLStatusError("Failed to create stack", 500);
                }
                const stackEntry = new Stack({
                    stack_name: row.stack_name,
                    stack_identifier: row.stack_identifier,
                    owner_identifier: row.owner_identifier,
                    goal_amount: row.goal_amount ?? null,
                    goal_deadline: row.goal_deadline ?? null,
                    category: row.category ?? null,
                    emoji: row.emoji ?? null,
                    created_at: row.created_at ?? null,
                    updated_at: row.updated_at ?? null,
                }, row.id);
                return stackEntry.stack;
            } catch (error) {
                as500(error);
            }
        }
        throw new HTMLStatusError("Stack fields are invalid", 400);
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
                id, stack_name, stack_identifier, owner_identifier,
                goal_amount, goal_deadline, category, emoji, created_at, updated_at
                FROM stacks WHERE deleted = FALSE AND owner_identifier = $1::uuid
                ORDER BY created_at DESC;`,
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
                        goal_amount: stack.goal_amount ?? null,
                        goal_deadline: stack.goal_deadline ?? null,
                        category: stack.category ?? null,
                        emoji: stack.emoji ?? null,
                        created_at: stack.created_at ?? null,
                        updated_at: stack.updated_at ?? null,
                    })
                }
            }
            return output;
        } catch (error) {
            as500(error);
        }
    }
    /**
     * Builds the member roster for a shared stack: the owner plus everyone listed
     * in any of the stack's substacks' `users_list`. Each member's `raised_cents`
     * is the sum of transaction amounts (in cents) they initiated into the stack's
     * substacks.
     */
    static async getMembers(stack_identifier: string): Promise<StackMemberAPIType[]> {
        try {
            const stackRows = await query<{ owner_identifier: string }>(
                `SELECT owner_identifier FROM stacks WHERE deleted = FALSE AND stack_identifier = $1::uuid LIMIT 1;`,
                [stack_identifier]
            );
            if (stackRows.length === 0) {
                throw new HTMLStatusError("Stack not found", 404);
            }
            const owner_identifier = stackRows[0]?.owner_identifier;

            const substackRows = await query<{ users_list: string }>(
                `SELECT users_list FROM substacks WHERE deleted = FALSE AND stack_identifier = $1::uuid;`,
                [stack_identifier]
            );
            const memberIds = new Set<string>();
            if (owner_identifier) {
                memberIds.add(owner_identifier);
            }
            for (const row of substackRows) {
                for (const member of normalizeUsersList(row.users_list)) {
                    memberIds.add(member);
                }
            }
            if (memberIds.size === 0) {
                return [];
            }

            const ids = Array.from(memberIds);
            const userRows = await query<{
                user_identifier: string;
                firstname: string;
                lastname: string;
                email: string;
            }>(
                `SELECT user_identifier, firstname, lastname, email
                 FROM users
                 WHERE deleted = FALSE AND user_identifier = ANY($1::uuid[]);`,
                [ids]
            );

            const raisedRows = await query<{ initiated_by: string; raised_cents: string | number }>(
                `SELECT t.initiated_by, COALESCE(SUM(t.amount), 0) AS raised_cents
                 FROM transactions AS t
                 INNER JOIN substacks AS ss ON t.to_identifier = ss.substack_identifier
                 WHERE ss.stack_identifier = $1::uuid AND t.initiated_by = ANY($2::uuid[])
                 GROUP BY t.initiated_by;`,
                [stack_identifier, ids]
            );
            const raisedByUser = new Map<string, number>();
            for (const row of raisedRows) {
                raisedByUser.set(row.initiated_by, Number(row.raised_cents) || 0);
            }

            return userRows.map((user) => ({
                user_identifier: user.user_identifier,
                firstname: user.firstname,
                lastname: user.lastname,
                handle: null,
                avatar_url: null,
                raised_cents: raisedByUser.get(user.user_identifier) ?? 0,
                role: user.user_identifier === owner_identifier ? "owner" : "member",
            }));
        } catch (error) {
            as500(error);
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
                    SET stack_name = $1,
                        goal_amount = COALESCE($3, goal_amount),
                        goal_deadline = COALESCE($4, goal_deadline),
                        category = COALESCE($5, category),
                        emoji = COALESCE($6, emoji),
                        updated_at = NOW()
                    WHERE deleted = FALSE AND stack_identifier = $2;`,
                        [
                            vStack.stripHtml(stack.stack_name),
                            stack.stack_identifier,
                            stack.goal_amount ?? null,
                            stack.goal_deadline ?? null,
                            stack.category ?? null,
                            stack.emoji ?? null,
                        ]);
                });
                const rowCount = q.rowCount;
                if (rowCount === 0) {
                    throw new HTMLStatusError("Stack not updated", 404);
                } else {
                    isUpdated = true;
                }
            } catch (error) {
                as500(error);
            }
        } else {
            throw new HTMLStatusError("Stack name is invalid", 400);
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
            as500(error);
        }
        return isDeleted;
    }
}

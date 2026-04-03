import dotenv from "dotenv";
import type { StackAPIType, StackType } from "../types/StackAPITypes.ts";
import { HTMLStatusError } from "../libs/HTMLStatusError.ts";
import { generateUUID } from "../libs/UUID.ts";
import { query, withTransaction } from "../libs/postgresDB.js";

export class Stack {
    private _stack!: StackType;
    constructor(data: StackAPIType) {
        this.stack = {
            id: 0,
            ownerIdentifier: data.ownerIdentifier,
            stackName: data.stackName,
            stackIdentifier: generateUUID(),
            createdBy: data.createdBy
        }
        this.storeStack(data.ownerIdentifier);
    }
    public get stack(): StackType {
        return this._stack;
    }
    public set stack(value: StackType) {
        this._stack = value;
    }

    /**
     * storeStack
     */
    private storeStack(ownerIdentifier: string) {
        let ownerId: number = 0;

        withTransaction(async (client) => {
            const fetchedUser = await client.query<{ id: number }>(
                `SELECT id FROM users WHERE user_identifier = $1 RETURNING id;`,
                [ownerIdentifier]
            )
            if (fetchedUser === undefined) {
                throw new HTMLStatusError("User not found", 404);
            } else {
                ownerId = fetchedUser.rows[0]!.id;

                const stackInsert = await query(
                    `INSERT INTO stacks (ownerIdentifier, stackName, stackIdentifier, createdBy) VALUES( $1 , $2 , $3, $4 );`,
                    [
                        ownerIdentifier,
                        this.stack.stackName,
                        this.stack.stackIdentifier,
                        ownerId
                    ]
                )
                if (!stackInsert) {
                    throw new HTMLStatusError("Stack creation failed", 400)
                }
            }
        });
    }

    /**
     * getForUser
     */
    static async getForUser(ownerIdentifier: string) {//: StackType[] | undefined
        const output: Array<StackType> = [];
        try {
            const fetchedStacks = await query<{
                id: number; ownerIdentifier: string;
                stackName: string; stackIdentifier: string; createdBy: number
            }>(
                `SELECT id, ownerIdentifier, stackName, stackIdentifier, createdBy FROM stacks WHERE deleted = 0 AND ownerIdentifier = $1;`,
                [ownerIdentifier]
            )
            if (fetchedStacks === undefined) {
                throw new HTMLStatusError("Stacks not found", 404);
            } else {
                for (const stack of fetchedStacks) {
                    output.push({
                        id: stack.id,
                        ownerIdentifier: stack.ownerIdentifier,
                        stackName: stack.stackName,
                        stackIdentifier: stack.stackIdentifier,
                        createdBy: stack.createdBy
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
    static renameStack(stackID: number, data: StackAPIType) {
        withTransaction(async (client) => {
            try {
                const updatedStack = await client.query(
                    `UPDATE stacks set stackName=$1 WHERE deleted = FALSE AND id = $2;`,
                    [data.stackName, stackID]
                )
                if (!updatedStack) {
                    throw new HTMLStatusError("Stack not found", 404);
                }
            } catch (error) {
                if (error instanceof HTMLStatusError) {
                    throw error;
                } else {
                    throw new HTMLStatusError((error as Error).message, 500);
                }
            }
        });
    }

    static async deleteStack(stackID: number, data: StackAPIType) {
        dotenv.config({ quiet: true });
        withTransaction(async (client) => {
            try {
                const updatedStack = await client.query(
                    `UPDATE stacks set deleted = TRUE WHERE ownerIdentifier = $1 AND id = $2;`,
                    [data.ownerIdentifier, stackID]
                )
                if (!updatedStack) {
                    throw new HTMLStatusError("Stack not found", 404);
                }
            } catch (error) {
                if (error instanceof HTMLStatusError) {
                    throw error;
                } else {
                    throw new HTMLStatusError((error as Error).message, 500);
                }
            }
        });
    }
}

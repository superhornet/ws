import dotenv from "dotenv";
import { DatabaseSync } from "node:sqlite";
import { HTMLStatusError } from "../libs/HTMLStatusError.js";
import { generateUUID } from "../libs/UUID.js";
export class Stack {
    _stack;
    constructor(data) {
        this.stack = {
            id: 0,
            ownerIdentifier: data.ownerIdentifier,
            stackName: data.stackName,
            stackIdentifier: generateUUID(),
            createdBy: data.createdBy
        };
        this.storeStack(data.ownerIdentifier);
    }
    get stack() {
        return this._stack;
    }
    set stack(value) {
        this._stack = value;
    }
    /**
     * storeStack
     */
    storeStack(ownerIdentifier) {
        dotenv.config({ quiet: true });
        const environment = process.env.NODE_ENV || "production";
        let ownerId = 0;
        try {
            if (environment === 'development') {
                const database = new DatabaseSync('westack.db');
                const creator = database.prepare(`SELECT id FROM users WHERE identifier = ?;`).get(ownerIdentifier);
                if (creator && Object.hasOwn(creator, 'id')) {
                    ownerId = Number.parseInt(creator.id);
                }
                if (ownerId === 0) {
                    throw new HTMLStatusError("User not found", 404);
                }
                else {
                    const result = database.prepare(`INSERT INTO stacks (ownerIdentifier, stackName, stackIdentifier, createdBy) VALUES( ? , ? , ?, ? );`)
                        .run(ownerIdentifier, this.stack.stackName, this.stack.stackIdentifier, ownerId);
                    if (result.changes === 0) {
                        throw new HTMLStatusError("Stack creation failed", 400);
                    }
                }
                database.close();
            }
        }
        catch (error) {
            if (error instanceof HTMLStatusError) {
                throw error;
            }
            else {
                throw new HTMLStatusError(error.message, 500);
            }
        }
    }
    /**
     * getForUser
     */
    static getForUser(ownerIdentifier) {
        dotenv.config({ quiet: true });
        const environment = process.env.NODE_ENV || "production";
        const output = [];
        try {
            if (environment === "development") {
                const database = new DatabaseSync('westack.db');
                const fetchedStacks = database.prepare(`SELECT id, ownerIdentifier, stackName, stackIdentifier, createdBy FROM stacks WHERE deleted = 0 AND ownerIdentifier = ?;`).all(ownerIdentifier);
                database.close();
                //console.log(fetchedStacks);
                if (fetchedStacks === undefined) {
                    throw new HTMLStatusError("Stack not found", 404);
                }
                else {
                    for (const stack of fetchedStacks) {
                        output.push({
                            id: stack.id,
                            ownerIdentifier: stack.ownerIdentifier,
                            stackName: stack.stackName,
                            stackIdentifier: stack.stackIdentifier,
                            createdBy: stack.createdBy
                        });
                    }
                }
                return output;
            }
            return [];
        }
        catch (error) {
            if (error instanceof HTMLStatusError) {
                throw error;
            }
            else {
                throw new HTMLStatusError(error.message, 500);
            }
        }
    }
    static rename(stackID, data) {
        dotenv.config({ quiet: true });
        const environment = process.env.NODE_ENV || "production";
        try {
            if (environment === "development") {
                const database = new DatabaseSync('westack.db');
                const updatedStack = database.prepare(`UPDATE stacks set stackName=? WHERE deleted = 0 AND id = ?;`).run(data.stackName, stackID);
                database.close();
                if (updatedStack === undefined || updatedStack && Object.hasOwn(updatedStack, 'changes') && updatedStack.changes === 0) {
                    throw new HTMLStatusError("Stack not found", 404);
                }
            }
        }
        catch (error) {
            if (error instanceof HTMLStatusError) {
                throw error;
            }
            else {
                throw new HTMLStatusError(error.message, 500);
            }
        }
    }
    static delete(stackID, data) {
        dotenv.config({ quiet: true });
        const environment = process.env.NODE_ENV || "production";
        try {
            if (environment === "development") {
                const database = new DatabaseSync('westack.db');
                const updatedStack = database.prepare(`UPDATE stacks set deleted = 1 WHERE ownerIdentifier = ? AND id = ?;`)
                    .run(data.ownerIdentifier, stackID);
                database.close();
                if (updatedStack === undefined || updatedStack && Object.hasOwn(updatedStack, 'changes') && updatedStack.changes === 0) {
                    throw new HTMLStatusError("Stack not found", 404);
                }
            }
        }
        catch (error) {
            if (error instanceof HTMLStatusError) {
                throw error;
            }
            else {
                throw new HTMLStatusError(error.message, 500);
            }
        }
        //throw new HTMLStatusError(`Method not implemented. cID: ${stackID} oID: ${data.ownerIdentifier}`, 501);
    }
}
//# sourceMappingURL=Stack.js.map
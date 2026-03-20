import dotenv from "dotenv";
import { HTMLStatusError } from "../libs/HTMLStatusError.js";
import { generateUUID } from "../libs/UUID.js";
import { SubStackQueryTypes } from "../types/SubStackAPITypes.js";
import { DatabaseSync } from "node:sqlite";
export class SubStack {
    _substack;
    constructor(data) {
        this.substack = {
            id: 0,
            createdBy: data.createdBy,
            stackIdentifier: data.stackIdentifier,
            substackIdentifier: generateUUID(),
            substackName: data.substackName,
            balance: 0,
            usersList: new Set([data.createdBy])
        };
        this.storeSubStack();
    }
    storeSubStack() {
        dotenv.config({ quiet: true });
        const environment = process.env.NODE_ENV || "production";
        const ownerId = this.substack.createdBy;
        let stackId = 0;
        try {
            if (environment === 'development') {
                const database = new DatabaseSync('westack.db');
                const stack = database.prepare(`SELECT id FROM stacks WHERE stackIdentifier = ?;`).get(this.substack.stackIdentifier);
                if (stack && Object.hasOwn(stack, 'id')) {
                    stackId = Number.parseInt(stack.id);
                }
                if (stackId === 0) {
                    throw new HTMLStatusError("Stack not found", 404);
                }
                else {
                    const result = database.prepare(`INSERT INTO substacks (createdBy, stackIdentifier, substackIdentifier, substackName, usersList) VALUES( ? , ? , ? , ? , ? );`)
                        .run(ownerId, this.substack.stackIdentifier, this.substack.substackIdentifier, this.substack.substackName, this.substack.usersList.entries().toArray().toString());
                    if (result.changes === 0) {
                        throw new HTMLStatusError("SubStack creation failed", 400);
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
            //throw new HTMLStatusError(`Data: ${ownerId}.`, 501);
        }
    }
    static getSubStack(key, type = '') {
        dotenv.config({ quiet: true });
        const environment = process.env.NODE_ENV || "production";
        const output = [];
        try {
            if (environment === "development") {
                const database = new DatabaseSync('westack.db');
                let fetchedSubstacks;
                switch (type) {
                    case SubStackQueryTypes.OWNERID:
                        fetchedSubstacks = database.prepare(`SELECT id, stackIdentifier, substackName, substackIdentifier, createdBy, usersList FROM substacks WHERE deleted = 0 AND createdBy = ?;`).all(key);
                        break;
                    case SubStackQueryTypes.STACKID:
                        fetchedSubstacks = database.prepare(`SELECT id, stackIdentifier, substackName, substackIdentifier, createdBy, usersList FROM substacks WHERE deleted = 0 AND stackIdentifier = ?;`).all(key);
                        break;
                    case SubStackQueryTypes.SUBSTACKNAME:
                        fetchedSubstacks = database.prepare(`SELECT id, stackIdentifier, substackName, substackIdentifier, createdBy, usersList FROM substacks WHERE deleted = 0 AND substackName = ?;`).all(key);
                        break;
                    default:
                        fetchedSubstacks = database.prepare(`SELECT id, stackIdentifier, substackName, substackIdentifier, createdBy, usersList FROM substacks WHERE deleted = 0 AND id = ?;`).all(key);
                        break;
                }
                database.close();
                //console.log(fetchedSubstacks);
                if (fetchedSubstacks === undefined) {
                    throw new HTMLStatusError("Substack not found", 404);
                }
                else {
                    for (const substack of fetchedSubstacks) {
                        output.push({
                            id: substack.id,
                            balance: substack.balance,
                            stackIdentifier: substack.stackIdentifier,
                            substackName: substack.substackName,
                            substackIdentifier: substack.substackIdentifier,
                            usersList: stringToSet(substack.usersList),
                            createdBy: substack.createdBy
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
        //throw new HTMLStatusError("Method not implemented.", 501);
    }
    static rename(substackID, data) {
        dotenv.config({ quiet: true });
        const environment = process.env.NODE_ENV || "production";
        try {
            if (environment === "development") {
                const database = new DatabaseSync('westack.db');
                const users = [...data.usersList].toString();
                const updatedSubstack = database.prepare(`UPDATE substacks set substackName= ? , usersList= ? WHERE deleted = 0 AND id = ?;`)
                    .run(data.substackName, users, substackID);
                database.close();
                if (updatedSubstack === undefined || updatedSubstack && Object.hasOwn(updatedSubstack, 'changes') && updatedSubstack.changes === 0) {
                    throw new HTMLStatusError("Substack not found", 404);
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
    static delete(substackID, data) {
        dotenv.config({ quiet: true });
        const environment = process.env.NODE_ENV || "production";
        try {
            if (environment === "development") {
                const database = new DatabaseSync('westack.db');
                const deletedSubstack = database.prepare(`UPDATE substacks set deleted = 1 WHERE deleted = 0 AND id = ? AND substackIdentifier = ?;`)
                    .run(substackID, data.substackIdentifier);
                database.close();
                if (deletedSubstack === undefined || deletedSubstack && Object.hasOwn(deletedSubstack, 'changes') && deletedSubstack.changes === 0) {
                    throw new HTMLStatusError("Substack not found", 404);
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
    static getBalance(identifier) {
        let balance = 0;
        const database = new DatabaseSync('westack.db');
        const substack = database.prepare(`SELECT id, balance FROM substacks WHERE substackIdentifier = ?;`).get(identifier);
        database.close();
        if (substack && Object.hasOwn(substack, 'balance')) {
            balance = (Number.parseInt(substack.balance) / 100);
        }
        return balance;
    }
    get substack() {
        return this._substack;
    }
    set substack(value) {
        this._substack = value;
    }
    static getParentStack(stackID) {
        const output = [];
        const database = new DatabaseSync('westack.db');
        const stacks = database.prepare(`SELECT DISTINCT stackIdentifier FROM substacks WHERE stackIdentifier = ?;`).get(stackID);
        database.close();
        if (stacks && Object.hasOwn(stacks, 'stackIdentifier')) {
            output.push(stacks.stackIdentifier);
        }
        return output[0];
    }
}
/**
 *
 * @param dataString
 * @returns Set
 */
function stringToSet(dataString) {
    const arrayData = dataString.split(",")
        .map(part => Number.parseInt(part.trim()));
    const outputSet = new Set(arrayData);
    return outputSet;
}
//# sourceMappingURL=SubStack.js.map
import { HTMLStatusError } from "../libs/HTMLStatusError.ts";
import { generateUUID } from "../libs/UUID.ts";
import { SubStackQueryTypes, type SubStackAPIType, type SubStackType } from "../types/SubStackAPITypes.ts";
import { query, withTransaction } from "../libs/postgresDB.js";

export class SubStack {
    private _substack!: SubStackType;
    constructor(data: SubStackAPIType) {
        this.substack = {
            id: 0,
            createdBy: data.createdBy,
            stackIdentifier: data.stackIdentifier,
            substackIdentifier: generateUUID(),
            substackName: data.substackName,
            balance: 0,
            usersList: new Set<number>([data.createdBy])
        }
        this.storeSubStack();
    }
    public get substack(): SubStackType {
        return this._substack;
    }
    public set substack(value: SubStackType) {
        this._substack = value;
    }

    storeSubStack() {
        const ownerId: number = this.substack.createdBy;

        withTransaction(async (client) => {
            try {
                await client.query(
                    `INSERT INTO substacks (createdBy, stackIdentifier, substackIdentifier, substackName, usersList) VALUES( $1 , $2 , $3 , $4 , $5 );`,
                    [ownerId, this.substack.stackIdentifier, this.substack.substackIdentifier, this.substack.substackName, this.substack.usersList.entries().toArray().toString()]
                )
            } catch (error) {
                if (error instanceof HTMLStatusError) {
                    throw error;
                } else {
                    throw new HTMLStatusError((error as Error).message, 500);

                }
            };
        })
    }
    static async getSubStack(key: string | number, type: string = ''): Promise<SubStackType[] | undefined> {
        const output: Array<SubStackType> = [];
        try {
            let fetchedSubstacks;
            switch (type) {
                case SubStackQueryTypes.OWNERID:
                    fetchedSubstacks = query<{
                        id: number;
                        balance: number;
                        stackIdentifier: string;
                        substackName: string;
                        substackIdentifier: string;
                        createdBy: number;
                        usersList: string
                    }>(
                        `SELECT id, balance, stackIdentifier, substackName, substackIdentifier, createdBy, usersList FROM substacks WHERE deleted = FALSE AND createdBy = $1;`,
                        [key]

                    );
                    break;
                case SubStackQueryTypes.STACKID:
                    fetchedSubstacks = query<{
                        id: number;
                        balance: number;
                        stackIdentifier: string;
                        substackName: string;
                        substackIdentifier: string;
                        createdBy: number;
                        usersList: string
                    }>(
                        `SELECT id, balance, stackIdentifier, substackName, substackIdentifier, createdBy, usersList FROM substacks WHERE deleted = FALSE AND stackIdentifier = $1;`,
                        [key]

                    );
                    break;
                case SubStackQueryTypes.SUBSTACKNAME:
                    fetchedSubstacks = query<{
                        id: number;
                        balance: number;
                        stackIdentifier: string;
                        substackName: string;
                        substackIdentifier: string;
                        createdBy: number;
                        usersList: string
                    }>(
                        `SELECT id, balance, stackIdentifier, substackName, substackIdentifier, createdBy, usersList FROM substacks WHERE deleted = FALSE AND substackName = $1;`,
                        [key]

                    );
                    break;
            }
            if (fetchedSubstacks === undefined) {
                throw new HTMLStatusError("Substack not found", 404);
            } else {
                for (const substack of await fetchedSubstacks) {
                    output.push({
                        id: substack.id,
                        balance: substack.balance,
                        stackIdentifier: substack.stackIdentifier,
                        substackName: substack.substackName,
                        substackIdentifier: substack.substackIdentifier,
                        usersList: stringToSet(substack.usersList),
                        createdBy: substack.createdBy
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
    static renameSubstack(substackID: number, data: SubStackAPIType) {
        withTransaction(async (client) => {
            try {
                const users = [...data.usersList].toString();

                const updatedSubstack = await client.query(
                    `UPDATE substacks set substackName= $1 , usersList= $2 WHERE deleted = FALSE AND id = $3;`,
                    [data.substackName, users, substackID]
                )
                if (updatedSubstack === undefined) {
                    throw new HTMLStatusError("Substack Not Found", 404);

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
    static deleteSubstack(substackID: number, data: SubStackAPIType) {
                withTransaction(async (client) => {
            try {
                const deletedSubstack = await client.query(
                    `UPDATE substacks set deleted = TRUE WHERE deleted = FALSE AND id = $1 AND substackIdentifier = $2;`,
                    [substackID, data.substackIdentifier]
                )
                if (deletedSubstack === undefined) {
                    throw new HTMLStatusError("Substack Not Found", 404);

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
    static async getBalance(identifier: string) {//: Promise<number>
        let balance = 0;
        const fetchedBalance = await query<{ id: number; balance: number }>(
            `SELECT id, balance FROM substacks WHERE substackIdentifier = $1;`,
            [identifier]
        );
        balance = fetchedBalance[0]!.balance;
        return balance / 100;
    }
    static async getParentStack(stackID: string) {
        const stacks = await query<{ stackIdentifier: string }>(
            `SELECT DISTINCT stackIdentifier FROM substacks WHERE stackIdentifier = $1;`,
            [stackID]
        )

        return stacks[0]!.stackIdentifier;
    }

}
/**
 *
 * @param dataString
 * @returns Set
 */
function stringToSet(dataString: string): Set<number> {
    const arrayData = dataString.split(",")
        .map(part => Number.parseInt(part.trim()))

    const outputSet = new Set<number>(arrayData);
    return outputSet;
}

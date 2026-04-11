import { TransactionItemType, TransactionProcessorType, TransactionQueryTypes, type TransactionAPIType, type TransactionType } from "../types/TransactionAPITypes.ts";
import { HTMLStatusError } from "../libs/HTMLStatusError.ts";
import { SubStack } from "./SubStack.ts";
import { query, withTransaction } from "../libs/postgresDB.ts";

export class Transaction {
    private _transaction!: TransactionType;
    readonly #toIdentifier: string;
    #to!: number;
    #toName!: string;
    readonly #fromIdentifier: string;
    #from!: number;
    #fromName!: string;
    readonly #data: TransactionAPIType;
    constructor(data: TransactionAPIType) {
        this.#toIdentifier = data.toIdentifier;
        this.#fromIdentifier = data.fromIdentifier;
        this.#data = data;
    }
    static async create(data: TransactionAPIType): Promise<Transaction> {
        const transaction = new Transaction(data);
        await transaction.storeTransaction();
        return transaction;
    }
    private async details(){
        const [from, fromName] = await uuidToSubStack(this.#fromIdentifier);
        const [to, toName] = await uuidToSubStack(this.#toIdentifier);
            this.#from = from as number;
            this.#fromName = fromName as string;
            this.#to = to as number;
            this.#toName = toName as string;

    }
    private async storeTransaction() {
        await this.details();
        this.transaction = {
            id: 0,
            processor: this.#data.processor,
            transactionType: this.#data.transactionType,
            occurredOn: "",
            processedOn: "",
            amount: this.#data.amount,
            toID: this.#to,
            fromID: this.#from,
            toName: this.#toName,
            fromName: this.#fromName,
            balance: 0,
            notation: ""
        }

        const theTransaction: TransactionType = this.transaction;
        await withTransaction(async (client) => {
            let balance = await SubStack.getBalance(this.#toIdentifier);
            try {

                if ([TransactionItemType.DEBIT, TransactionItemType.INITIAL_FUND].includes(theTransaction.transactionType)) {
                    balance += theTransaction.amount;
                }
                await client.query(`INSERT INTO transactions (processor, processedOn, fromID, toID, fromName, toName, amount, balance, notation, transactionType) VALUES( ? , ? , ? , ? , ? , ? , ? , ? , ? , ? );`,
                    [theTransaction.processor, (theTransaction.transactionType === TransactionProcessorType.INTERNAL) ? null : "",
                    theTransaction.fromID, theTransaction.toID, theTransaction.fromName,
                    theTransaction.toName, theTransaction.amount * 100, balance * 100, "", theTransaction.transactionType]
                )
                await setBalanceBySubstackId(balance * 100, theTransaction.toID);
                if ([TransactionItemType.DEBIT, TransactionItemType.INITIAL_FUND].includes(theTransaction.transactionType) &&
                    [TransactionProcessorType.APPLE,
                    TransactionProcessorType.BITCOIN,
                    TransactionProcessorType.CASHAPP,
                    TransactionProcessorType.GOOGLE,
                    TransactionProcessorType.MOONPAY,
                    TransactionProcessorType.STRIPE,
                    ].includes(theTransaction.processor)) {
                    let fee = 0;
                    if (theTransaction.amount > 2500) {
                        fee = 25;
                    } else if (theTransaction.amount <= 75) {
                        fee = .75;
                    } else {
                        fee = theTransaction.amount * 0.01;
                    }
                    balance -= fee;
                    await client.query(`INSERT INTO transactions (processor, processedOn, fromID, toID, fromName, toName, amount, balance, notation, transactionType) VALUES( ? , ? , ? , ? , ? , ? , ? , ? , ? , ? );`,
                        [TransactionProcessorType.INTERNAL, null,
                        theTransaction.toID, 1, theTransaction.toName,
                            "Service Fee", fee * 100, balance * 100, "", TransactionItemType.FEE]
                    )
                    await setBalanceBySubstackId(balance * 100, theTransaction.toID);
                    await client.query(`INSERT INTO transactions (processor, processedOn, fromID, toID, fromName, toName, amount, balance, notation, transactionType) VALUES( ? , ? , ? , ? , ? , ? , ? , ? , ? , ? );`,
                        [TransactionProcessorType.INTERNAL, null,
                            0, 1, theTransaction.toName, "Funds",
                        fee * 100, (await SubStack.getBalance('83d13d18-3802-407f-b9b6-73f39b17e31d') + fee) * 100, "Service Fee", TransactionItemType.SETTLED]
                    )
                    await setBalanceBySubstackId((await SubStack.getBalance('83d13d18-3802-407f-b9b6-73f39b17e31d') + fee) * 100, 1)
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
    static async getTransactions(key: string, queryType: string) {
            const output: Array<Omit< TransactionType, 'processedOn' | "fromID" | "toID" >> =[];
        try {
            let fetchedTransactions;
            switch (queryType) {
                case TransactionQueryTypes.SUBSTACK:
                    fetchedTransactions = await query<{
                        id: number;
                        amount: number;
                        balance: number;
                        occurredOn: string;
                        processor: string;
                        fromName: string;
                        toName: string;
                        notation: string;
                        transactionType: string;
                    }>(
                        `select * from transactions where toID = $1 OR fromID = $2 AND transactionType != 'Settled';`,
                        [uuidToSubStack(key), uuidToSubStack(key)]
                    )
                    break;
                case TransactionQueryTypes.STACK:
                    fetchedTransactions = await query<{
                        id: number;
                        amount: number;
                        balance: number;
                        occurredOn: string;
                        processor: string;
                        fromName: string;
                        toName: string;
                        notation: string;
                        transactionType: string;
                    }>(`select * from transactions where toID in (SELECT id FROM substacks WHERE stackIdentifier = ? ) OR fromID IN (SELECT id FROM substacks WHERE stackIdentifier = ?) AND transactionType != 'Settled';`,
                        [await SubStack.getParentStack(key), await SubStack.getParentStack(key)]
                    )
                    break;
                default:
                    break;
            }
            if (fetchedTransactions === undefined) {
                throw new HTMLStatusError("No transactions found", 404);
            } else {
                for (const transaction of fetchedTransactions) {
                    output.push({
                        id: transaction.id,
                        amount: ((transaction.amount) / 100),
                        balance: ((transaction.balance) / 100),
                        occurredOn: (transaction.occurredOn),
                        processor: (transaction.processor),
                        fromName: (transaction.fromName),
                        toName: (transaction.toName),
                        notation: (transaction.notation),
                        transactionType: (transaction.transactionType)
                    })
                }
            }

        } catch (error) {
            throw new HTMLStatusError((error as Error).message, 500);

        }
        return output;
    }
    public get transaction(): TransactionType {
        return this._transaction;
    }
    public set transaction(value: TransactionType) {
        this._transaction = value;
    }
}
async function uuidToSubStack(identifier: string){
    const output: (number|string)[] = [0, ""];

    const substack = await query<{id: number; substackName: string}>(
        `SELECT id, substackName FROM substacks WHERE substackIdentifier = $1;`,
        [identifier]
    )
    if(substack[0]){
        output[0] = substack[0].id;
        output[1] = substack[0].substackName;
    }
    return output
}


async function setBalanceBySubstackId(balance: number, subStackID: number) {
    await withTransaction(async (client) => {
        try {
            await client.query(
                `UPDATE substacks SET balance = $1 WHERE id = $2;`,
                [balance, subStackID]
            )
        } catch (error) {
            throw new HTMLStatusError((error as Error).message, 500);
        }
    });
}


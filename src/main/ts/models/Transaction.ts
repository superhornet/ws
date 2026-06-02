import { TransactionItemType, TransactionProcessorType, TransactionQueryTypes, type TransactionAPIType } from "../types/TransactionAPITypes.ts";
import { HTMLStatusError } from "../libs/HTMLStatusError.ts";
import { SubStack } from "./SubStack.ts";
import { query, withTransaction } from "../libs/postgresDB.ts";
import { Validator } from "../libs/Validator.ts";
import type { SubStackAPIType } from "../types/SubStackAPITypes.ts";

export interface ITransaction {
    readTransaction(): TransactionAPIType
}

export class Transaction {
    private pTransaction!: TransactionAPIType;
    private get transaction(): TransactionAPIType {
        return this.pTransaction;
    }
    private set transaction(value: TransactionAPIType) {
        this.pTransaction = value;
    }
    private pId!: number;
    private get id() {
        return this.pId;
    }
    private set id(value) {
        this.pId = value;
    }
    constructor(
        transaction: TransactionAPIType,
        id: number | bigint
    ) {
        try {
            this.transaction = transaction;
            this.id = Number(id);
        } catch (error) {
            throw new Error((error as Error).message);
        }
    }
    static async storeTransaction(transaction: TransactionAPIType) {
        const vTransaction = new Validator({ //Validator for transaction
            version: "1.0",
            numberValidation: { // Validator for transaction amount (0..$10k]
                integerMin: 0,
                integerMax: 1000000, //$10,000.00
                floatMin: 0,
                floatMax: 10000.01
            },
            stringValidation: { //Validator for notation text
                minLength: 0,
                maxLength: 512,
                locale: "en-us"
            }
        });
        const amountChecked: boolean =
            vTransaction.numberValidate(transaction.amount);
        const noteChecked: boolean =
            vTransaction.stringValidate(vTransaction.stripHtml(transaction.notation));

        const from_balance = await SubStack.getBalance(transaction.from_identifier);
        const to_balance = await SubStack.getBalance(transaction.to_identifier);
        const authorizedUsers = await SubStack.getUsersList(transaction.from_identifier);
        if (transaction.amount > from_balance) {
            throw new HTMLStatusError("Insufficient funds", 400);
        }
        const isAuthorized = authorizedUsers.has(transaction.initiated_by)
        if (amountChecked && noteChecked && isAuthorized) {
            try {
                const q = await withTransaction(async (client) => {
                    if ([TransactionItemType.DEBIT, TransactionItemType.INITIAL_FUND].includes(transaction.transaction_type) &&
                        [TransactionProcessorType.APPLE,
                        TransactionProcessorType.BITCOIN,
                        TransactionProcessorType.CASHAPP,
                        TransactionProcessorType.GOOGLE,
                        TransactionProcessorType.MOONPAY,
                        TransactionProcessorType.STRIPE,
                        ].includes(transaction.processor)) {
                        let fee = 0;
                        if (transaction.amount > 2500) {
                            fee = 25;
                        } else if (transaction.amount <= 75) {
                            fee = .75;
                        } else {
                            fee = transaction.amount * 0.01;
                        }

                        //balance -= fee;
                        await client.query(
                            `INSERT INTO transactions (
                            amount,
                            processor,
                            from_identifier,
                            to_identifier,
                            notation,
                            transaction_type,
                            initiated_by
                          )
                        VALUES (
                            $1,
                            $2,
                            $3,
                            $4,
                            $5,
                            $6,
                            $7
                          )`,
                            [fee * 100, transaction.processor, transaction.from_identifier, await Transaction.getFeeSubStack(),
                                "Service Fee", transaction.transaction_type, transaction.initiated_by]
                        );
                    }
                    await client.query(
                        `UPDATE substacks SET balance = $2 WHERE substack_identifier = $1;`, [transaction.from_identifier, Math.round((from_balance - transaction.amount) * 100)]
                    );
                    await client.query(
                        `UPDATE substacks SET balance = $2 WHERE substack_identifier = $1;`, [transaction.to_identifier, Math.round((to_balance + transaction.amount) * 100)]
                    );
                    return await client.query(
                        `INSERT INTO transactions (
                            amount,
                            processor,
                            from_identifier,
                            to_identifier,
                            notation,
                            transaction_type,
                            initiated_by
                          )
                        VALUES (
                            $1,
                            $2,
                            $3,
                            $4,
                            $5,
                            $6,
                            $7
                          )
                        RETURNING id, amount, processor, from_identifier, to_identifier,
                        notation, transaction_type, initiated_by;`,
                        [transaction.amount * 100, transaction.processor, transaction.from_identifier, transaction.to_identifier,
                        transaction.notation, transaction.transaction_type, transaction.initiated_by]
                    )
                });
                const row = q.rows.at(0);
                if (!row) {
                    throw new HTMLStatusError("Failed to create transaction", 500);
                }
                const transactionEntry = new Transaction({
                    amount: row.amount,
                    processor: row.processor,
                    from_identifier: row.from_identifier,
                    to_identifier: row.to_identifier,
                    notation: row.notation,
                    transaction_type: row.transaction_type,
                    initiated_by: row.initiated_by,
                    balance: to_balance + row.amount
                }, row.id);
                return transactionEntry.transaction;
            } catch (error) {
                throw new Error((error as Error).message)
            }
        }
        return undefined;
    }
    public readTransaction(): TransactionAPIType {
        return this.transaction;
    }
    static async getTransactions(key: string, value: string) {
        const output: Array<TransactionAPIType> = [];
        try {
            let fetchedTransactions;
            switch (key) {
                case TransactionQueryTypes.SUBSTACK:
                    fetchedTransactions = await query<TransactionAPIType>(
                        `SELECT
                        initiated_by,
                        processor,
                        transaction_type,
                        amount,
                        to_identifier,
                        from_identifier,
                        notation
                        FROM transactions
                        WHERE to_identifier = $1 OR from_identifier=$1;`,
                        [value]
                    );
                    break;
                case TransactionQueryTypes.STACK:
                    fetchedTransactions = await query<TransactionAPIType>(
                        `SELECT
                        t.initiated_by,
                        t.processor,
                        t.transaction_type,
                        t.amount,
                        t.to_identifier,
                        t.from_identifier,
                        t.notation
                        FROM transactions AS t
                        INNER JOIN substacks AS s ON
                        t.from_identifier = s.substack_identifier OR
                        t.to_identifier = s.substack_identifier
                        WHERE s.stack_identifier = $1;`,
                        [value]
                    );
                    break;
                case TransactionQueryTypes.USER:
                    fetchedTransactions = await query<TransactionAPIType>(
                        `SELECT DISTINCT
                        u.email,
                        t.initiated_by,
                        t.processor,
                        t.transaction_type,
                        t.amount,
                        t.to_identifier,
                        t.from_identifier,
                        t.notation
                        FROM transactions AS t
                        INNER JOIN substacks AS ss ON
                        t.from_identifier = ss.substack_identifier OR
                        t.to_identifier = ss.substack_identifier
                        INNER JOIN stacks AS s ON
                        ss.stack_identifier = s.stack_identifier
                        INNER JOIN users AS u ON
                        s.owner_identifier = u.user_identifier
                        WHERE s.owner_identifier = $1;`,
                    [value]
                    );
                    break;
                default:
                    break;
            }
            if (fetchedTransactions === undefined) {
                throw new HTMLStatusError("No transactions found", 404);
            } else {
                for (const transaction of fetchedTransactions) {
                    output.push({
                        initiated_by: transaction.initiated_by,
                        processor: transaction.processor,
                        transaction_type: transaction.transaction_type,
                        amount: transaction.amount,
                        to_identifier: transaction.to_identifier,
                        from_identifier: transaction.from_identifier,
                        notation: transaction.notation
                    });
                }
            }
        } catch (error) {
            throw new HTMLStatusError((error as Error).message, 500);

        }
        return output;
    }
    static async getFeeSubStack() {
        try {
            let substackID: string = '';
            const feeSubStack = await query<SubStackAPIType>(
                `SELECT substack_identifier, stack_identifier FROM substacks WHERE deleted = FALSE AND substack_name = $1;`,
                ["Company Funds"]
            );
            for (const feeSSid of feeSubStack) {
                substackID = feeSSid.substack_identifier;
            }
            return substackID;

        } catch (error) {
            if (error instanceof HTMLStatusError) {
                throw error;
            } else {
                throw new HTMLStatusError((error as Error).message, 500);
            }
        }
    }

}

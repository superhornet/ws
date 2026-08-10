import { TransactionItemType, TransactionProcessorType, TransactionQueryTypes, type TransactionAPIType, type TransactionEnum, type TransactionProcessorEnum } from "../types/TransactionAPITypes.ts";
import { HTMLStatusError, as500 } from "../libs/HTMLStatusError.ts";
import { SubStack } from "./SubStack.ts";
import { query, withTransaction } from "../libs/postgresDB.ts";
import { Validator } from "../libs/Validator.ts";
import type { SubStackAPIType } from "../types/SubStackAPITypes.ts";

export class Transaction {
    static async storeTransaction(transaction: TransactionAPIType) {
        const vTransaction = new Validator({ //Validator for transaction
            version: "1.0",
            numberValidation: { // Validator for transaction amount (0..$10k] in cents
                integerMin: 1, // bounds are inclusive; 1 cent is the smallest allowed amount
                integerMax: 1000000, //$10,000.00
                floatMin: 1,
                floatMax: 1000000
            },
            stringValidation: { //Validator for notation text
                minLength: 0,
                maxLength: 512,
                locale: "en-us"
            }
        });
        // `amount` is integer cents: reject fractional cents (a non-integer would
        // otherwise fall through to the float branch of numberValidate) before the
        // range check.
        const amountChecked: boolean =
            Number.isInteger(transaction.amount) && vTransaction.numberValidate(transaction.amount);
        const noteChecked: boolean =
            vTransaction.stringValidate(transaction.notation);

        const authorizedUsers = await SubStack.getUsersList(transaction.from_identifier);

        // Guard clauses (authorization before field validity, preserving the prior
        // precedence) keep the happy path below flat.
        if (!authorizedUsers.has(transaction.initiated_by)) {
            throw new HTMLStatusError("Not authorized to transact on this substack", 403);
        }
        if (!amountChecked || !noteChecked) {
            throw new HTMLStatusError("Transaction fields are invalid", 400);
        }

        // `transaction.amount` is already integer cents — the DB's native unit — so
        // every balance mutation below uses it directly.
        const amountCents = transaction.amount;
        const feeBearingTypes: TransactionEnum[] = [TransactionItemType.DEBIT, TransactionItemType.INITIAL_FUND];
        const feeBearingProcessors: TransactionProcessorEnum[] = [
            TransactionProcessorType.APPLE,
            TransactionProcessorType.BITCOIN,
            TransactionProcessorType.CASHAPP,
            TransactionProcessorType.GOOGLE,
            TransactionProcessorType.MOONPAY,
            TransactionProcessorType.STRIPE,
        ];

        try {
            const { inserted, destBalanceCents } = await withTransaction(async (client) => {
                // The fee and main legs write the same seven columns, differing only in
                // amount, destination, and notation.
                const insertLedgerRow = (amount: number, to: string, notation: string) =>
                    client.query(
                        `INSERT INTO transactions (
                            amount, processor, from_identifier, to_identifier,
                            notation, transaction_type, initiated_by
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        RETURNING id, amount, processor, from_identifier, to_identifier,
                        notation, transaction_type, initiated_by, status, occurred_at AS created_at;`,
                        [amount, transaction.processor, transaction.from_identifier, to,
                            notation, transaction.transaction_type, transaction.initiated_by]
                    );

                // Atomic, guarded debit. The database re-evaluates `balance >= $2`
                // against the row it locks for the UPDATE, so two concurrent transfers
                // on the same source can never both pass it — the second blocks on the
                // lock, then sees the first's committed debit. rowCount === 0 means the
                // guard failed: insufficient funds.
                const debit = await client.query(
                    `UPDATE substacks SET balance = balance - $2 WHERE substack_identifier = $1 AND balance >= $2;`,
                    [transaction.from_identifier, amountCents]
                );
                if (debit.rowCount === 0) {
                    throw new HTMLStatusError("Insufficient funds", 400);
                }

                if (feeBearingTypes.includes(transaction.transaction_type) &&
                    feeBearingProcessors.includes(transaction.processor)) {
                    let feeCents = 0;
                    if (amountCents > 250000) {          // amount > $2,500.00
                        feeCents = 2500;                 // $25.00 flat
                    } else if (amountCents <= 7500) {    // amount <= $75.00
                        feeCents = 75;                   // $0.75 flat
                    } else {
                        feeCents = Math.round(amountCents / 100); // 1% of amount
                    }
                    await insertLedgerRow(feeCents, await Transaction.getFeeSubStack(), "Service Fee");
                }

                const credit = await client.query<{ balance: number }>(
                    `UPDATE substacks SET balance = balance + $2 WHERE substack_identifier = $1 RETURNING balance;`,
                    [transaction.to_identifier, amountCents]
                );
                if (credit.rowCount === 0) {
                    throw new HTMLStatusError("Destination substack not found", 404);
                }

                const inserted = await insertLedgerRow(amountCents, transaction.to_identifier, transaction.notation);
                return { inserted, destBalanceCents: credit.rows[0]!.balance };
            });

            const row = inserted.rows.at(0);
            if (!row) {
                throw new HTMLStatusError("Failed to create transaction", 500);
            }
            return {
                amount: row.amount,
                processor: row.processor,
                from_identifier: row.from_identifier,
                to_identifier: row.to_identifier,
                notation: row.notation,
                transaction_type: row.transaction_type,
                initiated_by: row.initiated_by,
                balance: destBalanceCents,
                status: row.status ?? null,
                created_at: row.created_at ?? null,
            };
        } catch (error) {
            as500(error);
        }
    }
    static async getTransactions(key: string, value: string) {
        try {
            let fetchedTransactions: TransactionAPIType[];
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
                        notation,
                        status,
                        occurred_at AS created_at
                        FROM transactions
                        WHERE to_identifier = $1::uuid OR from_identifier = $1::uuid
                        ORDER BY occurred_at DESC;`,
                        [value]
                    );
                    break;
                case TransactionQueryTypes.STACK:
                    // DISTINCT collapses the OR-join duplicates (a transfer matches
                    // both its source and destination substack) to one row per
                    // transaction, matching the USER query's shape.
                    fetchedTransactions = await query<TransactionAPIType>(
                        `SELECT DISTINCT
                        t.initiated_by,
                        t.processor,
                        t.transaction_type,
                        t.amount,
                        t.to_identifier,
                        t.from_identifier,
                        t.notation,
                        t.status,
                        t.occurred_at AS created_at
                        FROM transactions AS t
                        INNER JOIN substacks AS s ON
                        t.from_identifier = s.substack_identifier OR
                        t.to_identifier = s.substack_identifier
                        WHERE s.stack_identifier = $1::uuid
                        ORDER BY created_at DESC;`,
                        [value]
                    );
                    break;
                case TransactionQueryTypes.USER:
                    // DISTINCT collapses the OR-join duplicates (a transfer matches
                    // both its source and destination substack) to one row per
                    // transaction. Ordered newest-first.
                    fetchedTransactions = await query<TransactionAPIType>(
                        `SELECT DISTINCT
                        t.initiated_by,
                        t.processor,
                        t.transaction_type,
                        t.amount,
                        t.to_identifier,
                        t.from_identifier,
                        t.notation,
                        t.status,
                        t.occurred_at AS created_at
                        FROM transactions AS t
                        INNER JOIN substacks AS ss ON
                        t.from_identifier = ss.substack_identifier OR
                        t.to_identifier = ss.substack_identifier
                        INNER JOIN stacks AS s ON
                        ss.stack_identifier = s.stack_identifier
                        WHERE s.owner_identifier = $1::uuid
                        ORDER BY created_at DESC;`,
                    [value]
                    );
                    break;
                default:
                    // Unreachable via the controller (it rejects unknown keys with a
                    // 400 first), but fail closed if ever called directly.
                    throw new HTMLStatusError("Invalid transaction query key", 400);
            }
            return fetchedTransactions.map((transaction) => ({
                initiated_by: transaction.initiated_by,
                processor: transaction.processor,
                transaction_type: transaction.transaction_type,
                amount: transaction.amount,
                to_identifier: transaction.to_identifier,
                from_identifier: transaction.from_identifier,
                notation: transaction.notation,
                status: transaction.status ?? null,
                created_at: transaction.created_at ?? null,
            }));
        } catch (error) {
            as500(error);
        }
    }
    static async getFeeSubStack() {
        try {
            const feeSubStack = await query<SubStackAPIType>(
                `SELECT substack_identifier
                FROM substacks
                WHERE deleted = FALSE
                AND substack_name = $1
                ORDER BY id LIMIT 1;`,
                ["Company Funds"]
            );
            const feeSubStackId = feeSubStack.at(0)?.substack_identifier;
            if (!feeSubStackId) {
                throw new HTMLStatusError("Fee account is not configured", 500);
            }
            return feeSubStackId;
        } catch (error) {
            as500(error);
        }
    }
}

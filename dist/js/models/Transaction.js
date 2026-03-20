import dotenv from "dotenv";
import { DatabaseSync } from "node:sqlite";
import { TransactionItemType, TransactionProcessorType, TransactionQueryTypes } from "../types/TransactionAPITypes.js";
import { HTMLStatusError } from "../libs/HTMLStatusError.js";
import { SubStack } from "./SubStack.js";
export class Transaction {
    _transaction;
    constructor(data) {
        const [from, fromName] = uuidToSubStack(data.fromIdentifier);
        const [to, toName] = uuidToSubStack(data.toIdentifier);
        this.transaction = {
            id: 0,
            processor: data.processor,
            transactionType: data.transactionType,
            occurredOn: "",
            processedOn: "",
            amount: data.amount,
            toID: to,
            fromID: from,
            toName: toName,
            fromName: fromName,
            balance: SubStack.getBalance(data.toIdentifier),
            notation: ""
        };
        this.storeTransaction();
    }
    storeTransaction() {
        dotenv.config({ quiet: true });
        const environment = process.env.NODE_ENV || "production";
        const theTransaction = this.transaction;
        try {
            if (environment === 'development') {
                const database = new DatabaseSync('westack.db');
                const result = database.prepare(`INSERT INTO transactions (processor, processedOn, fromID, toID, fromName, toName, amount, balance, notation, transactionType) VALUES( ? , ? , ? , ? , ? , ? , ? , ? , ? , ? );`);
                let balance = theTransaction.balance;
                // TODO: Get "to" SubStack balance
                if ([TransactionItemType.DEBIT, TransactionItemType.INITIAL_FUND].includes(theTransaction.transactionType)) {
                    balance += theTransaction.amount;
                }
                result.run(theTransaction.processor, (theTransaction.transactionType === TransactionProcessorType.INTERNAL) ? null : "", theTransaction.fromID, theTransaction.toID, theTransaction.fromName, theTransaction.toName, theTransaction.amount * 100, balance * 100, "", theTransaction.transactionType);
                setBalanceBySubstackId(balance * 100, theTransaction.toID);
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
                    }
                    else if (theTransaction.amount <= 75) {
                        fee = .75;
                    }
                    else {
                        fee = theTransaction.amount * 0.01;
                    }
                    balance -= fee;
                    result.run(TransactionProcessorType.INTERNAL, null, theTransaction.toID, 1, theTransaction.toName, "Service Fee", fee * 100, balance * 100, "", TransactionItemType.FEE);
                    setBalanceBySubstackId(balance * 100, theTransaction.toID);
                    result.run(TransactionProcessorType.INTERNAL, null, 
                    /*theTransaction.toID*/ 0, 1, theTransaction.toName, "Funds", fee * 100, (SubStack.getBalance('83d13d18-3802-407f-b9b6-73f39b17e31d') + fee) * 100, "Service Fee", TransactionItemType.SETTLED);
                    setBalanceBySubstackId((SubStack.getBalance('83d13d18-3802-407f-b9b6-73f39b17e31d') + fee) * 100, 1);
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
    static getTransactions(key, queryType) {
        dotenv.config({ quiet: true });
        const environment = process.env.NODE_ENV || "production";
        const output = [];
        const database = new DatabaseSync("westack.db");
        try {
            if (environment === "development") {
                let fetchedTransactions;
                switch (queryType) {
                    case TransactionQueryTypes.SUBSTACK:
                        fetchedTransactions = database.prepare(`select * from transactions where toID = ? OR fromID = ? AND transactionType != 'Settled';`)
                            .all(uuidToSubStack(key)[0], uuidToSubStack(key)[0]);
                        break;
                    case TransactionQueryTypes.STACK:
                        fetchedTransactions = database.prepare(`select * from transactions where toID in (SELECT id FROM substacks WHERE stackIdentifier = ? ) OR fromID IN (SELECT id FROM substacks WHERE stackIdentifier = ?) AND transactionType != 'Settled';`)
                            .all(SubStack.getParentStack(key), SubStack.getParentStack(key));
                        break;
                    default:
                        break;
                }
                if (fetchedTransactions === undefined) {
                    throw new HTMLStatusError("No transactions found", 404);
                }
                else {
                    for (const transaction of fetchedTransactions) {
                        output.push({
                            id: transaction.id,
                            amount: (transaction.amount / 100),
                            balance: (transaction.balance / 100),
                            occurredOn: transaction.occurredOn,
                            processor: transaction.processor,
                            fromName: transaction.fromName,
                            toName: transaction.toName,
                            notation: transaction.notation,
                            transactionType: transaction.transactionType
                        });
                    }
                }
            }
        }
        catch (error) {
            throw new HTMLStatusError(error.message, 500);
        }
        finally {
            database.close();
        }
        return output;
    }
    get transaction() {
        return this._transaction;
    }
    set transaction(value) {
        this._transaction = value;
    }
}
function uuidToSubStack(identifier) {
    const output = [0, ""];
    const database = new DatabaseSync('westack.db');
    const substack = database.prepare(`SELECT id, substackName FROM substacks WHERE substackIdentifier = ?;`).get(identifier);
    database.close();
    if (substack && Object.hasOwn(substack, 'id') && Object.hasOwn(substack, 'substackName')) {
        output[0] = Number.parseInt(substack.id);
        output[1] = substack.substackName;
    }
    return output;
}
function setBalanceBySubstackId(balance, subStackID) {
    const database = new DatabaseSync('westack.db');
    database.prepare(`UPDATE substacks SET balance = ? WHERE id = ?;`).get(balance, subStackID);
    database.close();
}
//# sourceMappingURL=Transaction.js.map
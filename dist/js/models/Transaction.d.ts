import { type TransactionAPIType, type TransactionType } from "../types/TransactionAPITypes.ts";
export declare class Transaction {
    private _transaction;
    constructor(data: TransactionAPIType);
    storeTransaction(): void;
    static getTransactions(key: string | string[], queryType: string): Omit<TransactionType, "processedOn" | "fromID" | "toID">[];
    get transaction(): TransactionType;
    set transaction(value: TransactionType);
}
//# sourceMappingURL=Transaction.d.ts.map
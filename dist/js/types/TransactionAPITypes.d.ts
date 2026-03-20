export declare const TransactionItemType: {
    readonly INITIAL_FUND: string;
    readonly CREDIT: string;
    readonly DEBIT: string;
    readonly FEE: string;
    readonly PENALTY: string;
    readonly ADJUSTMENT: string;
    readonly SETTLED: string;
    readonly ROUNDUP: string;
};
export type TransactionEnum = (typeof TransactionItemType)[keyof typeof TransactionItemType];
export declare const TransactionProcessorType: {
    readonly INTERNAL: string;
    readonly ACH: string;
    readonly MOONPAY: string;
    readonly STRIPE: string;
    readonly APPLE: string;
    readonly GOOGLE: string;
    readonly CASHAPP: string;
    readonly BITCOIN: string;
};
export type TransactionProcessorEnum = (typeof TransactionProcessorType)[keyof typeof TransactionProcessorType];
/**
 * Data transmitted to/from the API before meta information is added
 */
export interface TransactionAPIType extends JSON {
    session: string;
    processor: TransactionProcessorEnum;
    transactionType: TransactionEnum;
    amount: number;
    toIdentifier: string;
    fromIdentifier: string;
    stackID: string;
}
/**
 * Represents a transaction as it exists in data
 */
export type TransactionType = {
    id: number;
    occurredOn: string;
    processor: TransactionProcessorEnum;
    processedOn: string;
    fromID: number;
    toID: number;
    fromName: string;
    toName: string;
    amount: number;
    balance: number;
    notation: string;
    transactionType: TransactionEnum;
};
export declare const TransactionQueryTypes: {
    readonly SUBSTACK: string;
    readonly STACK: string;
    readonly USER: string;
};
export type TransactionQueryEnum = (typeof TransactionQueryTypes)[keyof typeof TransactionQueryTypes];
//# sourceMappingURL=TransactionAPITypes.d.ts.map
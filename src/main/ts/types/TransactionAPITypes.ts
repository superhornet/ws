export const TransactionItemType = {
    INITIAL_FUND: "Initial" as string,
    CREDIT: "Credit" as string,
    DEBIT: "Debit" as string,
    FEE: "Fee" as string,
    PENALTY: "Penalty" as string,
    ADJUSTMENT: "Adjustment" as string,
    SETTLED: "Settled" as string,
    ROUNDUP: "Roundup" as string,
} as const;

export type TransactionEnum = (typeof TransactionItemType)[keyof typeof TransactionItemType];

export const TransactionProcessorType = {
    INTERNAL: "Internal" as string,
    ACH: "ACH" as string,
    MOONPAY: "Moonpay" as string,
    STRIPE: "Stripe" as string,
    APPLE: "Apple" as string,
    GOOGLE: "Google" as string,
    CASHAPP: "CashApp" as string,
    BITCOIN: "Bitcoin" as string,
} as const;

export type TransactionProcessorEnum = (typeof TransactionProcessorType)[keyof typeof TransactionProcessorType];
/**
 * Data transmitted to/from the API before meta information is added
 */
export interface TransactionAPIType extends JSON{
    session: string;
    processor: TransactionProcessorEnum; //processsor for the transaction
    transactionType: TransactionEnum; //type of transaction
    amount: number; //decimal amount
    toIdentifier: string; //substackIdentifier
    fromIdentifier: string; //substackIdentifier
    stackID: string;
};

/**
 * Represents a transaction as it exists in data
 */
export type TransactionType = {
    id: number,
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
}

export const TransactionQueryTypes = {
    SUBSTACK: "substack" as string,
    STACK: "stacK" as string,
    USER: "user" as string
} as const;

export type TransactionQueryEnum = (typeof TransactionQueryTypes)[keyof typeof TransactionQueryTypes];

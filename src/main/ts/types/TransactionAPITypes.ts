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
export interface TransactionAPIType{
    initiated_by: string;
    processor: TransactionProcessorEnum; //processsor for the transaction
    transaction_type: TransactionEnum; //type of transaction
    amount: number; //decimal amount
    to_identifier: string; //substackIdentifier
    from_identifier: string; //substackIdentifier
    notation: string;
    balance?: number;
};

export const TransactionQueryTypes = {
    SUBSTACK: "substack_identifier" as string,
    STACK: "stack_identifier" as string,
    USER: "owner_identifier" as string
} as const;

export type TransactionQueryEnum = (typeof TransactionQueryTypes)[keyof typeof TransactionQueryTypes];

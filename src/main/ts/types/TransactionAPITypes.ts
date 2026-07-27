export const TransactionItemType = {
    INITIAL_FUND: "Initial",
    CREDIT: "Credit",
    DEBIT: "Debit",
    FEE: "Fee",
    PENALTY: "Penalty",
    ADJUSTMENT: "Adjustment",
    SETTLED: "Settled",
    ROUNDUP: "Roundup",
} as const;

export type TransactionEnum = (typeof TransactionItemType)[keyof typeof TransactionItemType];

export const TransactionProcessorType = {
    INTERNAL: "Internal",
    ACH: "ACH",
    MOONPAY: "Moonpay",
    STRIPE: "Stripe",
    APPLE: "Apple",
    GOOGLE: "Google",
    CASHAPP: "CashApp",
    BITCOIN: "Bitcoin",
} as const;

export type TransactionProcessorEnum = (typeof TransactionProcessorType)[keyof typeof TransactionProcessorType];

export const TransactionStatusType = {
    PENDING: "pending",
    SETTLED: "settled",
    FAILED: "failed",
} as const;

export type TransactionStatusEnum = (typeof TransactionStatusType)[keyof typeof TransactionStatusType];
/**
 * Data transmitted to/from the API before meta information is added
 */
export interface TransactionAPIType{
    initiated_by: string;
    processor: TransactionProcessorEnum; //processsor for the transaction
    transaction_type: TransactionEnum; //type of transaction
    amount: number; //integer amount in cents
    to_identifier: string; //substackIdentifier
    from_identifier: string; //substackIdentifier
    notation: string;
    balance?: number;
    /** ISO timestamp the transaction was created. */
    created_at?: string | null;
    /** Settlement lifecycle state. */
    status?: TransactionStatusEnum | null;
};

export const TransactionQueryTypes = {
    SUBSTACK: "substack_identifier",
    STACK: "stack_identifier",
    USER: "owner_identifier"
} as const;

export type TransactionQueryEnum = (typeof TransactionQueryTypes)[keyof typeof TransactionQueryTypes];

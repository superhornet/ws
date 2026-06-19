export const RecurringDepositFrequencyType = {
    WEEKLY: "weekly",
    BIWEEKLY: "biweekly",
    MONTHLY: "monthly",
} as const;

export type RecurringDepositFrequencyEnum =
    (typeof RecurringDepositFrequencyType)[keyof typeof RecurringDepositFrequencyType];

/**
 * A scheduled, recurring transfer into a substack.
 *
 * Amounts are in **cents** to match substack balances. `from_identifier` is the
 * funding source (substack or external account identifier) and `to_identifier`
 * is the destination substack.
 */
export interface RecurringDepositAPIType {
    recurring_deposit_identifier?: string;
    from_identifier: string;
    to_identifier: string;
    amount_cents: number;
    frequency: RecurringDepositFrequencyEnum;
    next_run_at: string;
    created_at?: string | null;
    updated_at?: string | null;
}

/**
 * Lookup keys accepted by `GET /api/recurring-deposits`.
 */
export const RecurringDepositQueryTypes = {
    STACK: "stack_identifier",
    SUBSTACK: "substack_identifier",
} as const;

export type RecurringDepositQueryEnum =
    (typeof RecurringDepositQueryTypes)[keyof typeof RecurringDepositQueryTypes];

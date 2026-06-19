export interface SubStackAPIType {
    balance: number;
    stack_identifier: string;
    substack_identifier: string;
    substack_name: string;
    users_list: Set<string> | Array<string>;
    owner_identifier?: string;
    /** Savings target in cents. `null` when unset. */
    goal_amount?: number | null;
    /** ISO timestamp the goal should be met by. `null` when unset. */
    goal_deadline?: string | null;
    /** ISO timestamp the substack was created. */
    created_at?: string | null;
    /** ISO timestamp the substack was last updated. */
    updated_at?: string | null;
}

export const SubStackQueryTypes = {
    OWNERID: "owner-id" as string,
    STACKID: "stack-id" as string,
    SUBSTACKNAME: "substack-name" as string
} as const;

export type SubStackQueryEnum = (typeof SubStackQueryTypes)[keyof typeof SubStackQueryTypes];

/**
 * Minimal set of identifiers a substack lookup can be performed by. Only the
 * field matching the requested {@link SubStackQueryTypes} value is used.
 */
export interface SubStackLookup {
    stack_identifier?: string | undefined;
    owner_identifier?: string | undefined;
    substack_name?: string | undefined;
}

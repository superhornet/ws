export interface StackAPIType{
    stack_name: string;
    stack_identifier: string;
    owner_identifier: string;
    /** Savings target in cents. `null` when unset. */
    goal_amount?: number | null;
    /** ISO timestamp the goal should be met by. `null` when unset. */
    goal_deadline?: string | null;
    /** ISO timestamp the stack was created. */
    created_at?: string | null;
    /** ISO timestamp the stack was last updated. */
    updated_at?: string | null;
    /** Optional server-driven presentation category. `null` when unset. */
    category?: string | null;
    /** Optional server-driven presentation emoji. `null` when unset. */
    emoji?: string | null;
}

/**
 * A single member of a shared stack, returned by `GET /api/stack/members`.
 */
export interface StackMemberAPIType {
    user_identifier: string;
    firstname: string;
    lastname: string;
    handle?: string | null;
    avatar_url?: string | null;
    /** Total cents this member has contributed into the stack's substacks. */
    raised_cents: number;
    role?: "owner" | "member";
}

export interface SubStackAPIType {
    balance: number;
    stack_identifier: string;
    substack_identifier: string;
    substack_name: string;
    users_list: Set<string> | Array<string>;
    owner_identifier?: string;
}

export const SubStackQueryTypes = {
    OWNERID: "owner-id" as string,
    STACKID: "stack-id" as string,
    SUBSTACKNAME: "substack-name" as string
} as const;

export type SubStackQueryEnum = (typeof SubStackQueryTypes)[keyof typeof SubStackQueryTypes];

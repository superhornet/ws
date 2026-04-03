export interface SubStackAPIType extends JSON {
    session: string;
    createdBy: number;
    stackIdentifier: string;
    substackName: string;
    substackIdentifier: string;
    usersList: string;
}

export type SubStackType = {
    id: number;
    balance: number;
    stackIdentifier: string;
    substackIdentifier: string;
    substackName: string;
    usersList: Set<number> | Array<number>;
    createdBy: number;
}

export const SubStackQueryTypes = {
    OWNERID: "owner-id" as string,
    STACKID: "stack-id" as string,
    SUBSTACKNAME: "substack-name" as string
} as const;

export type SubStackQueryEnum = (typeof SubStackQueryTypes)[keyof typeof SubStackQueryTypes];

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
};
export declare const SubStackQueryTypes: {
    readonly OWNERID: string;
    readonly STACKID: string;
    readonly SUBSTACKNAME: string;
};
export type SubStackQueryEnum = (typeof SubStackQueryTypes)[keyof typeof SubStackQueryTypes];
//# sourceMappingURL=SubStackAPITypes.d.ts.map
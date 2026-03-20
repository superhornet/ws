import { type SubStackAPIType, type SubStackType } from "../types/SubStackAPITypes.ts";
export declare class SubStack {
    private _substack;
    constructor(data: SubStackAPIType);
    storeSubStack(): void;
    static getSubStack(key: string | number, type?: string): SubStackType[] | undefined;
    static rename(substackID: number, data: SubStackAPIType): void;
    static delete(substackID: number, data: SubStackAPIType): void;
    static getBalance(identifier: string): number;
    get substack(): SubStackType;
    set substack(value: SubStackType);
    static getParentStack(stackID: string): string | undefined;
}
//# sourceMappingURL=SubStack.d.ts.map
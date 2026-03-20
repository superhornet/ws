import type { StackAPIType, StackType } from "../types/StackAPITypes.ts";
export declare class Stack {
    private _stack;
    constructor(data: StackAPIType);
    get stack(): StackType;
    set stack(value: StackType);
    /**
     * storeStack
     */
    private storeStack;
    /**
     * getForUser
     */
    static getForUser(ownerIdentifier: string): StackType[] | undefined;
    static rename(stackID: number, data: StackAPIType): void;
    static delete(stackID: number, data: StackAPIType): void;
}
//# sourceMappingURL=Stack.d.ts.map
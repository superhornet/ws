import type { ValidatorOptionsTypes } from "../types/ValidatorOptionsTypes.ts";
export declare class Validator {
    private _version;
    private _options;
    constructor(options: ValidatorOptionsTypes);
    get options(): ValidatorOptionsTypes;
    set options(value: ValidatorOptionsTypes);
    get version(): string;
    set version(value: string);
    /**
     * stripHtml
     *
     * @param str
     * @returns string
     */
    stripHtml(str: string): string;
    /**
     * stringValidate
     *
     * @param str
     * @returns boolean
     */
    stringValidate(str: string): boolean;
    /**
     * emailValidate
     *
     * @param str
     * @returns boolean
     */
    emailValidate(str: string): boolean;
}
//# sourceMappingURL=Validator.d.ts.map
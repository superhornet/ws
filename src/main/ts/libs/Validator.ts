import type { ValidatorOptionsTypes } from "../types/ValidatorOptionsTypes.ts";

const DEFAULT_OPTIONS: Required<ValidatorOptionsTypes> = {
    version: "1.0",
    stringValidation: {
        minLength: 2,
        maxLength: 255,
        locale: "en-us",
    },
    emailValidation: {
        domainMinLength: 2,
        domainMaxLength: 10,
    },
    numberValidation: {
        integerMin: -2147483648,
        integerMax: 2147483647, // int4 max; bounds are inclusive
        floatMin: -2147483648,
        floatMax: 2147483648,
    },
};

export class Validator {
    public version: string;
    public options: ValidatorOptionsTypes;

    constructor(options?: ValidatorOptionsTypes) {
        // Merge per-section so a partial `options` object keeps the defaults for
        // any section it omits, rather than silently disabling that validator.
        this.options = {
            version: options?.version ?? DEFAULT_OPTIONS.version,
            stringValidation: options?.stringValidation ?? DEFAULT_OPTIONS.stringValidation,
            emailValidation: options?.emailValidation ?? DEFAULT_OPTIONS.emailValidation,
            numberValidation: options?.numberValidation ?? DEFAULT_OPTIONS.numberValidation,
        };
        this.version = this.options.version;
    }

    /**
     * stringValidate
     *
     * @param str
     * @returns boolean
     */
    public stringValidate(str: string): boolean {
        if (typeof str !== "string") {
            throw new TypeError("Input must be a string.");
        }
        const stringOptions = this.options.stringValidation;
        if (!stringOptions) {
            return true;
        }
        // Bounds are inclusive: a string at exactly min or max length is valid.
        return str.length >= stringOptions.minLength &&
            str.length <= stringOptions.maxLength;
    }

    /**
     * emailValidate
     *
     * @param str
     * @returns boolean
     */
    public emailValidate(str: string): boolean {
        if (typeof str !== "string") {
            throw new TypeError("Input must be a string.");
        }
        const emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(str);
    }

    /**
     * numberValidate
     *
     * @param num
     * @returns boolean
     */
    public numberValidate(num: number): boolean {
        if (typeof num !== "number") {
            return false;
        }
        const numberOptions = this.options.numberValidation;
        if (!numberOptions) {
            return false;
        }
        // Bounds are inclusive: a value at exactly min or max is valid.
        if (Number.isInteger(num)) {
            return num >= numberOptions.integerMin && num <= numberOptions.integerMax;
        }
        if (Number.isFinite(num)) {
            return num >= numberOptions.floatMin && num <= numberOptions.floatMax;
        }
        return false; // NaN / Infinity
    }
}

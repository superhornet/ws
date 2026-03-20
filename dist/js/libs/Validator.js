export class Validator {
    _version = "";
    _options;
    constructor(options) {
        this.version = options?.version;
        this.options = options || {
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
                integerMax: 2147483648,
                floatMin: -2147483648,
                floatMax: 2147483648,
            }
        };
    }
    get options() {
        return this._options;
    }
    set options(value) {
        this._options = value;
    }
    get version() {
        return this._version;
    }
    set version(value) {
        this._version = value;
    }
    /**
     * stripHtml
     *
     * @param str
     * @returns string
     */
    stripHtml(str) {
        if (typeof str !== "string") {
            throw new TypeError("Input must be a string.");
        }
        return str
            .replaceAll('&', "{ampersand}")
            .replaceAll('>', `{greater_than}`)
            .replaceAll('<', "{less_than}")
            .replaceAll('"', "{inch_mark}")
            .replaceAll('\'', "{foot_mark}")
            .replaceAll('/', "{solidus}")
            .replaceAll(';', "{semicolon}");
    }
    /**
     * stringValidate
     *
     * @param str
     * @returns boolean
     */
    stringValidate(str) {
        let isValid = true;
        //console.log(this.options);
        const stringOptions = this.options.stringValidation;
        if (typeof str !== "string") {
            isValid = false;
        }
        if (stringOptions && str.length < stringOptions.minLength) {
            isValid = false;
        }
        if (stringOptions && str.length > stringOptions.maxLength) {
            isValid = false;
        }
        return isValid;
    }
    /**
     * emailValidate
     *
     * @param str
     * @returns boolean
     */
    emailValidate(str) {
        if (typeof str !== "string" || str.length === 0) {
            throw new TypeError("Input must be of type string");
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(str)) {
            throw new TypeError("Input is not in the format of a valid email");
        }
        const [userid, host] = str.split("@");
        if (!userid && !host) {
            return false;
        }
        return true;
    }
}
//# sourceMappingURL=Validator.js.map
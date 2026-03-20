export interface ValidatorOptionsTypes {
    version: string;
    stringValidation: {
        minLength: number;
        maxLength: number;
        locale?: string;
    };
    emailValidation?: {
        domainMinLength: number;
        domainMaxLength: number;
    };
    numberValidation?: {
        integerMin: number;
        integerMax: number;
        floatMin: number;
        floatMax: number;
    };
}
//# sourceMappingURL=ValidatorOptionsTypes.d.ts.map
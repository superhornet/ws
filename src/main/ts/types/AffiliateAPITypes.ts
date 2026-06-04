export const AffiliationType = {
    ANCESTOR: "Ancestor" as string,
    DESCENDANT: "Descendant" as string
} as const;

export type AffiliationEnum = (typeof AffiliationType)[keyof typeof AffiliationType];

export interface AffiliateAPIType{
    affiliation_code: string;
    affiliation_type: AffiliationEnum;
    referrer: string;
};

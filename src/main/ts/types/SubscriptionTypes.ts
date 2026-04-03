export const SubscriptionType = {
    BASIC: "Basic" as string,
    PRO: "Pro" as string,
    FREE: "Free" as string
} as const;

export type SubscriptionEnum = (typeof SubscriptionType)[keyof typeof SubscriptionType];

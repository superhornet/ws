import { type SubscriptionEnum } from "../types/SubscriptionTypes.ts";
export interface UserAPIType{
    firstname: string;
    lastname: string;
    email: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    zipcode: string|number;
    // Server-controlled: defaults to 'Free' at signup and is only changed via the
    // billing/entitlement flow. Never read from the request body (returned in
    // responses only), so a client cannot self-elevate its tier.
    subscription_level?: SubscriptionEnum;
    user_identifier?: string;
    affiliate?: string;
    phone_e164?: string | null;
}

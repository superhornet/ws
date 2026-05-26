import type { SubscriptionEnum } from "./SubscriptionTypes.ts";

export interface UserAPIType{
    firstname: string;
    lastname: string;
    email: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    zipcode: string|number;
    subscription_level: SubscriptionEnum;
    user_identifier?: string;
}

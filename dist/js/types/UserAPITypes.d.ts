import type { SubscriptionEnum } from "./SubscriptionTypes.ts";
export interface UserAPIType extends JSON {
    message: string;
    session: string;
    firstname: string;
    identifier: string;
    lastname: string;
    email: string;
    city: string;
    state: string;
    level: SubscriptionEnum;
}
//# sourceMappingURL=UserAPITypes.d.ts.map
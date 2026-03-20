import { type SubscriptionEnum } from "../types/SubscriptionTypes.ts";
import type { UserAPIType } from "../types/UserAPITypes.ts";
export interface TUser {
    nameF: string;
    nameL: string;
    email: string;
    emailID: string;
    emailHost: string;
    city: string;
    state: string;
    subscriptionLevel: string;
    /** identifier is uuid */
    identifier: string;
}
export interface TUserConfig {
    /** foreign key uuid */
    forUser: string;
}
/**
 * User interface definition
 */
export interface IUser {
    _User: TUser;
    _UserConfig: TUserConfig;
}
export declare class User implements IUser {
    private get User();
    private set User(value);
    _User: TUser;
    _UserConfig: TUserConfig;
    private userObj;
    private environment;
    private id;
    private database;
    constructor(firstname: string, lastname: string, email: string, city: string, state: string, subscriptionlevel: SubscriptionEnum);
    toJSON(): {
        city: string;
        email: string;
        emailHost: string;
        emailID: string;
        firstname: string;
        id: number;
        identifier: string;
        lastname: string;
        state: string;
        subscriptionLevel: string;
    };
    private storeUser;
    private openDatabase;
    private closeDatabase;
    private openDevDatabase;
    private openProdDatabase;
    private closeDevDatabase;
    static fetchById(userid: string): {
        id: number;
        email: string;
        firstname: string;
        lastname: string;
        identifier: string;
        city: string;
        state: string;
        level: SubscriptionEnum;
    };
    static updateUser(data: UserAPIType): void;
    static deleteUser(data: UserAPIType): void;
}
//# sourceMappingURL=User.d.ts.map
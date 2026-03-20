import type { NotificationAPIType, NotificationType } from "../types/NotificationAPITypes.ts";
export declare class Notification {
    private _message;
    private _identifier;
    get identifier(): string;
    set identifier(value: string);
    constructor(data: NotificationAPIType);
    get message(): string;
    set message(value: string);
    /**
     * storeNotification
     */
    storeNotification(): void;
    static getAllForUser(data: string): NotificationType[];
    static setAsSeen(data: number): NotificationType[];
    static setDeleted(data: number): NotificationType[];
}
//# sourceMappingURL=Notification.d.ts.map
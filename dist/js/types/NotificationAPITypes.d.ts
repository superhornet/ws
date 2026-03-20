export interface NotificationAPIType extends JSON {
    id: number;
    session: string;
    seen: number;
    message: string;
    identifier?: string;
}
export type NotificationType = {
    id: number;
    seen: number;
    message: string;
    identifier?: string;
};
//# sourceMappingURL=NotificationAPITypes.d.ts.map
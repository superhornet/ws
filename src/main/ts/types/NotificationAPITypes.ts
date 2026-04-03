export interface NotificationAPIType extends JSON {
    id: number;
    session: string;
    seen: boolean;
    message: string;
    identifier?: string;
}

export type NotificationType  = {
    id: number;
    seen: boolean;
    message: string;
    identifier?: string;
}

export declare class Notification {
    id: string;
    organization_id: string;
    recipient_user_id: string;
    type: string;
    title: string;
    body: string;
    data: Record<string, any> | null;
    is_read: boolean;
    read_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

export interface NotificationPayload {
    title: string;
    body: string;
    data?: Record<string, string>;
}
export interface SendResult {
    successCount: number;
    failureCount: number;
    invalidTokens: string[];
}
export interface INotificationProvider {
    sendToTokens(tokens: string[], payload: NotificationPayload): Promise<SendResult>;
}
export declare const NOTIFICATION_PROVIDER = "NOTIFICATION_PROVIDER";

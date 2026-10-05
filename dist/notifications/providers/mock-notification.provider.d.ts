import { INotificationProvider, NotificationPayload, SendResult } from '../interfaces/INotificationProvider.interface';
export declare class MockNotificationProvider implements INotificationProvider {
    private readonly logger;
    readonly sentMessages: Array<{
        tokens: string[];
        payload: NotificationPayload;
    }>;
    sendToTokens(tokens: string[], payload: NotificationPayload): Promise<SendResult>;
}

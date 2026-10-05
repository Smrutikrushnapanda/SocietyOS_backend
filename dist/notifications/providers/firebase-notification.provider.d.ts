import { OnModuleInit } from '@nestjs/common';
import { INotificationProvider, NotificationPayload, SendResult } from '../interfaces/INotificationProvider.interface';
export declare class FirebaseNotificationProvider implements INotificationProvider, OnModuleInit {
    private readonly logger;
    private messaging;
    onModuleInit(): void;
    sendToTokens(tokens: string[], payload: NotificationPayload): Promise<SendResult>;
}

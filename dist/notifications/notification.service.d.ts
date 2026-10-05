import type { INotificationProvider } from './interfaces/INotificationProvider.interface';
import { DataSource } from 'typeorm';
import { Notification } from '../database/entities/notification.entity';
import { PushTokenService } from './push-token.service';
export interface CreateNotificationInput {
    organizationId: string;
    recipientUserId: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, any>;
}
export declare class NotificationService {
    private readonly dataSource;
    private readonly pushTokenService;
    private readonly notificationProvider;
    constructor(dataSource: DataSource, pushTokenService: PushTokenService, notificationProvider: INotificationProvider);
    create(input: CreateNotificationInput): Promise<Notification>;
    findAllForUser(userId: string, organizationId: string): Promise<Notification[]>;
    findOneForUser(id: string, userId: string, organizationId: string): Promise<Notification>;
    markRead(id: string, userId: string, organizationId: string): Promise<Notification>;
    markAllRead(userId: string, organizationId: string): Promise<void>;
}

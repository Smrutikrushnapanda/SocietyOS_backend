import { NotificationService } from './notification.service';
export declare class NotificationController {
    private readonly notificationService;
    constructor(notificationService: NotificationService);
    findAll(req: any): Promise<import("../database/entities/notification.entity").Notification[]>;
    findOne(req: any, id: string): Promise<import("../database/entities/notification.entity").Notification>;
    markAllRead(req: any): Promise<{
        message: string;
    }>;
    markRead(req: any, id: string): Promise<import("../database/entities/notification.entity").Notification>;
}

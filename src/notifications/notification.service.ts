import type {
  INotificationProvider,
  NotificationPayload,
} from './interfaces/INotificationProvider.interface';
import { Injectable, ForbiddenException, NotFoundException, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Notification } from '../database/entities/notification.entity';
import { NOTIFICATION_PROVIDER } from './interfaces/INotificationProvider.interface';
import { PushTokenService } from './push-token.service';
import { randomUUID } from 'crypto';

export interface CreateNotificationInput {
  organizationId: string;
  recipientUserId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly pushTokenService: PushTokenService,
    @Inject(NOTIFICATION_PROVIDER)
    private readonly notificationProvider: INotificationProvider,
  ) {}

  async create(input: CreateNotificationInput): Promise<Notification> {
    const repo = this.dataSource.getRepository(Notification);
    const notification = repo.create({
      id: randomUUID(),
      organization_id: input.organizationId,
      recipient_user_id: input.recipientUserId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ?? null,
      is_read: false,
      read_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const saved = await repo.save(notification);

    // Best-effort push delivery — failure must not affect the saved record
    try {
      const tokens = await this.pushTokenService.getActiveTokensForUser(
        input.recipientUserId,
        input.organizationId,
      );
      if (tokens.length > 0) {
        const payload: NotificationPayload = {
          title: input.title,
          body: input.body,
          data: input.data
            ? Object.fromEntries(
                Object.entries(input.data).map(([k, v]) => [k, String(v)]),
              )
            : undefined,
        };
        const result = await this.notificationProvider.sendToTokens(tokens, payload);
        if (result.invalidTokens.length > 0) {
          await this.pushTokenService.deactivateByTokenValues(result.invalidTokens);
        }
      }
    } catch {
      // Provider failure must not corrupt notification ownership or data
    }

    return saved;
  }

  async findAllForUser(
    userId: string,
    organizationId: string,
  ): Promise<Notification[]> {
    return this.dataSource.getRepository(Notification).find({
      where: { recipient_user_id: userId, organization_id: organizationId },
      order: { created_at: 'DESC' },
    });
  }

  async findOneForUser(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<Notification> {
    const notification = await this.dataSource
      .getRepository(Notification)
      .findOne({ where: { id, recipient_user_id: userId, organization_id: organizationId } });

    if (!notification) {
      throw new NotFoundException('Notification not found or access denied');
    }
    return notification;
  }

  async markRead(id: string, userId: string, organizationId: string): Promise<Notification> {
    const notification = await this.findOneForUser(id, userId, organizationId);
    if (notification.is_read) return notification;

    notification.is_read = true;
    notification.read_at = new Date();
    notification.updated_at = new Date();
    return this.dataSource.getRepository(Notification).save(notification);
  }

  async markAllRead(userId: string, organizationId: string): Promise<void> {
    await this.dataSource
      .getRepository(Notification)
      .createQueryBuilder()
      .update(Notification)
      .set({ is_read: true, read_at: new Date(), updated_at: new Date() })
      .where(
        'recipient_user_id = :userId AND organization_id = :organizationId AND is_read = false',
        { userId, organizationId },
      )
      .execute();
  }
}

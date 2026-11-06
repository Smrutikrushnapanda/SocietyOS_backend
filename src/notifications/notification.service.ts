import type {
  INotificationProvider,
  NotificationPayload,
} from './interfaces/INotificationProvider.interface';
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Inject,
  Optional,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Notification } from '../database/entities/notification.entity';
import { User } from '../database/entities/user.entity';
import { NOTIFICATION_PROVIDER } from './interfaces/INotificationProvider.interface';
import { PushTokenService } from './push-token.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { randomUUID } from 'crypto';
import { NotificationPreferencesService } from './notification-preferences.service';

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
    @Optional() private readonly whatsAppService?: WhatsAppService,
    @Optional()
    private readonly preferences: NotificationPreferencesService = new NotificationPreferencesService(
      dataSource,
    ),
  ) {}

  async create(input: CreateNotificationInput): Promise<Notification> {
    if (!input.title || typeof input.title !== 'string') {
      throw new Error('Notification title is required');
    }
    if (!input.body || typeof input.body !== 'string') {
      throw new Error('Notification body is required');
    }

    // Enforce reasonable length limits
    const title = input.title.trim().substring(0, 255);
    const body = input.body.trim().substring(0, 4000);
    const type = (input.type || 'SYSTEM').trim().substring(0, 50);

    // Sanitize data payload: prevent dangerous deep-link schemes (javascript:, data:, vbscript:)
    let sanitizedData: Record<string, any> | null = null;
    if (input.data && typeof input.data === 'object') {
      sanitizedData = {};
      for (const [key, value] of Object.entries(
        input.data as Record<string, unknown>,
      )) {
        if (typeof value === 'string') {
          const lower = value.trim().toLowerCase();
          if (
            lower.startsWith('javascript:') ||
            lower.startsWith('data:') ||
            lower.startsWith('vbscript:')
          ) {
            sanitizedData[key] = '#';
          } else {
            sanitizedData[key] = value;
          }
        } else {
          sanitizedData[key] = value;
        }
      }
    }

    const repo = this.dataSource.getRepository(Notification);
    const notification = repo.create({
      id: randomUUID(),
      organization_id: input.organizationId,
      recipient_user_id: input.recipientUserId,
      type,
      title,
      body,
      data: sanitizedData,
      is_read: false,
      read_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const saved = await repo.save(notification);

    // Best-effort push delivery — failure must not affect the saved record
    try {
      this.notificationProvider.assertDispatchAllowed?.();
      const allowed = await this.preferences.allowsPush(
        input.recipientUserId,
        input.organizationId,
        type,
      );
      const tokens = allowed
        ? await this.pushTokenService.getActiveTokensForUser(
            input.recipientUserId,
            input.organizationId,
          )
        : [];
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
        const result = await this.notificationProvider.sendToTokens(
          tokens,
          payload,
        );
        if (result.invalidTokens.length > 0) {
          await this.pushTokenService.deactivateByTokenValues(
            result.invalidTokens,
          );
        }
      }
    } catch {
      // Provider failure must not corrupt notification ownership or data
    }

    // Best-effort WhatsApp delivery — failure must not affect the saved record
    try {
      if (this.whatsAppService) {
        const userRepo = this.dataSource.getRepository(User);
        const recipientUser = await userRepo.findOneBy({
          id: input.recipientUserId,
        });
        if (recipientUser?.mobileNumber) {
          const waMessage = `🔔 *${input.title}*\n\n${input.body}`;
          await this.whatsAppService.sendNotification(
            recipientUser.mobileNumber,
            waMessage,
            { organizationId: input.organizationId, category: input.type },
          );
        }
      }
    } catch {
      // WhatsApp delivery error must never fail notification creation
    }

    return saved;
  }

  private requireRecipient(userId: string, organizationId: string) {
    if (!userId || !organizationId)
      throw new ForbiddenException(
        'Authenticated recipient and organization required',
      );
  }

  async page(userId: string, organizationId: string, page = 1, unread = false, state?: string) {
    this.requireRecipient(userId, organizationId);
    if (!Number.isInteger(page) || page < 1 || page > 10000)
      throw new BadRequestException('Invalid notification page');
    if (state && !['all', 'read', 'unread'].includes(state)) throw new BadRequestException('Invalid notification tab');
    const where = {
      recipient_user_id: userId,
      organization_id: organizationId,
      ...(state === 'read' ? { is_read: true } : unread || state === 'unread' ? { is_read: false } : {}),
    };
    const [items, total] = await this.dataSource
      .getRepository(Notification)
      .findAndCount({
        where,
        order: { created_at: 'DESC', id: 'DESC' },
        skip: (page - 1) * 20,
        take: 20,
      });
    return { items, total, page, limit: 20, totalPages: Math.ceil(total / 20) };
  }

  async findAllForUser(
    userId: string,
    organizationId: string,
  ): Promise<Notification[]> {
    this.requireRecipient(userId, organizationId);
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
    this.requireRecipient(userId, organizationId);
    const notification = await this.dataSource
      .getRepository(Notification)
      .findOne({
        where: {
          id,
          recipient_user_id: userId,
          organization_id: organizationId,
        },
      });

    if (!notification) {
      throw new NotFoundException('Notification not found or access denied');
    }
    return notification;
  }

  async markRead(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<Notification> {
    const notification = await this.findOneForUser(id, userId, organizationId);
    if (notification.is_read) return notification;

    notification.is_read = true;
    notification.read_at = new Date();
    notification.updated_at = new Date();
    return this.dataSource.getRepository(Notification).save(notification);
  }

  async markAllRead(userId: string, organizationId: string): Promise<void> {
    this.requireRecipient(userId, organizationId);
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

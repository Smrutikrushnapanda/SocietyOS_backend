import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Poll } from '../database/entities/poll.entity';
import { Notification } from '../database/entities/notification.entity';
import { UserRole } from '../database/entities/user-role.entity';
import { BusinessDeliveryEligibility, notificationEventKey } from '../notifications/delivery/business-notification-events';
import { NotificationDeliveryService } from '../notifications/delivery/delivery.service';
import { PostgresDeliveryStore } from '../notifications/delivery/delivery.store';
import { NotificationCategory } from '../notifications/notification-preferences.policy';

@Injectable()
export class PollDeliveryAdmission {
  constructor(private readonly source: DataSource) {}

  async enqueue(manager: EntityManager, poll: Poll): Promise<void> {
    const memberships = await manager.getRepository(UserRole).find({
      where: { organization_id: poll.organization_id }, relations: { role: true },
    });
    const eligibility = new BusinessDeliveryEligibility(this.source);
    const recipients = new Set(memberships.filter(member => member.organization_id === poll.organization_id && member.role?.name === 'RESIDENT' && member.role.isActive).map(member => member.userId));
    for (const userId of recipients) {
      const input = {
        organization_id: poll.organization_id, recipient_user_id: userId,
        reference_id: poll.id, category: NotificationCategory.POLL,
        idempotency_key: notificationEventKey(`poll:${poll.id}:WHATSAPP:published`),
      };
      if (!(await eligibility.resident(input))) continue;
      await manager.getRepository(Notification).createQueryBuilder().insert().values({
        id: notificationEventKey(`poll:${poll.id}:INAPP:${userId}:published`),
        organization_id: poll.organization_id, recipient_user_id: userId, type: 'POLL',
        title: 'New community poll', body: `${poll.title}\nOpen Community Polls to view the options and vote.`,
        data: () => ':pollNotificationData',
        is_read: false, read_at: null, created_at: new Date(), updated_at: new Date(),
      }).setParameter('pollNotificationData', JSON.stringify({ pollId: poll.id, referenceId: poll.id, category: 'POLL' })).orIgnore().execute();
      for (const channel of ['WHATSAPP', 'PUSH'] as const) {
        const delivery = new NotificationDeliveryService(new PostgresDeliveryStore(this.source, manager, channel), eligibility);
        await delivery.enqueue({ ...input, idempotency_key: notificationEventKey(`poll:${poll.id}:${channel}:published`) });
      }
    }
  }
}

export function pollWhatsAppMessage(poll: Poll, societyName: string, now = new Date()): string {
  const format = (date: Date) => new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(date));
  return `🗳️ *New community poll*\n*${societyName || 'Your society'}*\n\n${poll.title}\n\n${new Date(poll.starts_at) > now ? `Voting opens: ${format(poll.starts_at)}` : 'Voting is open.'}\nCloses: ${format(poll.ends_at)}\n\n${poll.poll_type === 'MULTIPLE' ? 'Choose one or more options.' : 'Choose one option.'}\nOpen SocietyOS → Notices → Community Polls to cast your vote.`;
}

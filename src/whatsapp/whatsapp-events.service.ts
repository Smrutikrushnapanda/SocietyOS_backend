import { Visitor } from '../database/entities/visitor.entity';
import type { TemplateKey } from '../society-settings/settings.model';
import { Flat } from '../database/entities/flat.entity';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Resident } from '../database/entities/resident.entity';
import { UserRole } from '../database/entities/user-role.entity';
import { NotificationPreferencesService } from '../notifications/notification-preferences.service';
import { NotificationCategory } from '../notifications/notification-preferences.policy';
import { WhatsAppService } from './whatsapp.service';

interface MessageTemplate { key: TemplateKey; variables: Record<string, string>; visitorId?: string }

@Injectable()
export class WhatsAppEventsService {
  private readonly logger = new Logger(WhatsAppEventsService.name);

  constructor(private readonly source: DataSource, private readonly whatsapp: WhatsAppService) {}

  async resident(organizationId: string, residentId: string, category: string, message: string, template?: MessageTemplate): Promise<void> {
    if (!organizationId || !residentId) return;
    await this.deliver(organizationId, { id: residentId }, category, message, template);
  }

  async flat(organizationId: string, flatId: string, category: string, message: string, template?: MessageTemplate): Promise<void> {
    if (!organizationId || !flatId) return;
    await this.deliver(organizationId, { flat_id: flatId }, category, message, template);
  }

  private async deliver(organizationId: string, scope: { id?: string; flat_id?: string }, category: string, message: string, template?: MessageTemplate): Promise<void> {
    try {
      const residents = await this.source.getRepository(Resident).find({
        where: { ...scope, organization_id: organizationId, isActive: true },
      });
      const sent = new Set<string>();
      for (const resident of residents) {
        if (sent.has(resident.user_id)) continue;
        const membership = await this.source.getRepository(UserRole).findOne({
          where: { userId: resident.user_id, organization_id: organizationId },
          relations: { role: true, user: true },
        });
        if (membership?.role?.name !== 'RESIDENT' || !membership.role.isActive || !membership.user?.mobileNumber) continue;
        if (Object.values<string>(NotificationCategory).includes(category)) {
          const preferences = await new NotificationPreferencesService(this.source).read(resident.user_id, organizationId);
          if (!preferences.some(preference => preference.category === category && preference.enabled)) continue;
        }
        sent.add(resident.user_id);
        let text = message;
        if (template) {
          const flat = resident.flat_id ? await this.source.getRepository(Flat).findOne({ where: { id: resident.flat_id, organization_id: organizationId } }) : null;
          const visitor = template.visitorId ? await this.source.getRepository(Visitor).findOne({ where: { id: template.visitorId, organization_id: organizationId } }) : null;
          text = await this.whatsapp.renderTemplate(organizationId, template.key, { resident_name: resident.name || 'Resident', flat_number: flat?.flat_identifier || 'your flat', ...template.variables, ...(visitor ? { visitor_name: visitor.name } : {}) });
        }
        await this.whatsapp.sendNotification(membership.user.mobileNumber, text, { organizationId, category });
      }
    } catch {
      // Business writes have committed; delivery failure must not undo their result.
      this.logger.warn('WhatsApp event delivery unavailable');
    }
  }
}

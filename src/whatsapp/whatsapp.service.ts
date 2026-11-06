import { WhatsAppTemplateService } from './whatsapp-template.service';
import { DEFAULT_TEMPLATES, type TemplateKey } from '../society-settings/settings.model';
import { renderMessage } from './whatsapp-template.service';
import { BadRequestException, Inject, Injectable, Logger, Optional, ServiceUnavailableException } from '@nestjs/common';
import { Redis } from 'ioredis';
import type {
  IWhatsAppProvider,
  WhatsAppHealthResult,
} from './interfaces/whatsapp-provider.interface';
import { WHATSAPP_PROVIDER } from './interfaces/whatsapp-provider.interface';

export interface WhatsAppNotificationSettings {
  isEnabled: boolean;
  notifyVisitor: boolean;
  notifyMaintenance: boolean;
  notifyPayment: boolean;
  notifyComplaint: boolean;
  notifyNotice: boolean;
}

const DEFAULT_SETTINGS: WhatsAppNotificationSettings = {
  isEnabled: true,
  notifyVisitor: true,
  notifyMaintenance: true,
  notifyPayment: true,
  notifyComplaint: true,
  notifyNotice: true,
};

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    @Inject(WHATSAPP_PROVIDER)
    private readonly provider: IWhatsAppProvider,
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
    @Optional() private readonly templates?: WhatsAppTemplateService,
  ) {}

  async renderTemplate(organizationId: string, key: TemplateKey, variables: Record<string, string>): Promise<string> {
    if (this.templates) return this.templates.render(organizationId, key, variables);
    return renderMessage(DEFAULT_TEMPLATES[key], { society_name: 'Society', ...variables });
  }

  getProvider(): IWhatsAppProvider {
    return this.provider;
  }

  async getHealth(): Promise<WhatsAppHealthResult> {
    return this.provider.checkHealth();
  }

  async sendOtp(mobileNumber: string, otp: string): Promise<boolean> {
    const text = `🔒 *SocietyOS Login Verification*\n\nYour one-time login code is: *${otp}*\n\nValid for 5 minutes. Do not share this code with anyone.`;
    const result = await this.provider.sendMessage(mobileNumber, text);
    if (!result.success) {
      this.logger.warn(`Failed to deliver login OTP to recipient`);
    }
    return result.success;
  }

  async sendPasswordRecoveryOtp(mobileNumber: string, otp: string): Promise<boolean> {
    const text = `🔑 *SocietyOS Password Recovery*\n\nYour password reset code is: *${otp}*\n\nValid for 5 minutes. If you did not request a password reset, please contact society administration immediately.`;
    const result = await this.provider.sendMessage(mobileNumber, text);
    if (!result.success) {
      this.logger.warn(`Failed to deliver recovery OTP to recipient`);
    }
    return result.success;
  }

  async sendNotification(
    to: string,
    message: string,
    options?: { organizationId?: string; category?: string },
  ): Promise<boolean> {
    if (options?.organizationId) {
      let settings: WhatsAppNotificationSettings;
      try {
        settings = await this.getOrgSettings(options.organizationId);
      } catch {
        return false;
      }
      if (!settings.isEnabled) {
        return false;
      }
      if (options.category) {
        const cat = options.category.toLowerCase();
        if (cat.includes('visitor') && !settings.notifyVisitor) return false;
        if (cat.includes('maintenance') && !settings.notifyMaintenance) return false;
        if (cat.includes('payment') && !settings.notifyPayment) return false;
        if (cat.includes('complaint') && !settings.notifyComplaint) return false;
        if ((cat.includes('notice') || cat.includes('poll')) && !settings.notifyNotice) return false;
      }
    }

    const result = await this.provider.sendMessage(to, message);
    return result.success;
  }

  async sendTestMessage(
    to: string,
    actorUserId: string,
    organizationName?: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const cleanNumber = to.replace(/\D/g, '');
    if (cleanNumber.length < 10) {
      return {
        success: false,
        error: 'Invalid recipient phone number',
      };
    }

    const text = `👋 *SocietyOS WhatsApp Integration Test*\n\nThis is a verified test message from *${organizationName || 'Society Administration'}*.\n\nConnection is active and operational. Timestamp: ${new Date().toISOString()}`;
    return this.provider.sendMessage(to, text);
  }

  async getOrgSettings(organizationId: string): Promise<WhatsAppNotificationSettings> {
    try {
      const raw = await this.redis.get(`wa:settings:${organizationId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
        const settings = { ...DEFAULT_SETTINGS };
        for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof WhatsAppNotificationSettings)[]) {
          if (key in parsed) {
            if (typeof parsed[key] !== 'boolean') throw new Error();
            settings[key] = parsed[key];
          }
        }
        return settings;
      }
    } catch {
      throw new ServiceUnavailableException('WhatsApp notification settings unavailable. Retry before changing preferences.');
    }
    return { ...DEFAULT_SETTINGS };
  }

  async updateOrgSettings(
    organizationId: string,
    settings: Partial<WhatsAppNotificationSettings>,
  ): Promise<WhatsAppNotificationSettings> {
    if (!settings || typeof settings !== 'object' || Array.isArray(settings) ||
      Object.entries(settings).some(([key, value]) => !Object.hasOwn(DEFAULT_SETTINGS, key) || typeof value !== 'boolean')) {
      throw new BadRequestException('WhatsApp preferences must contain only supported boolean settings');
    }
    try {
      // Merge within Redis so simultaneous category changes cannot overwrite each other.
      const raw = await this.redis.eval(`
        local current = cjson.decode(redis.call('GET', KEYS[1]) or ARGV[1])
        local defaults = cjson.decode(ARGV[1])
        local patch = cjson.decode(ARGV[2])
        for key, value in pairs(defaults) do
          if current[key] ~= nil and type(current[key]) ~= 'boolean' then return redis.error_reply('Invalid settings') end
          if current[key] == nil then current[key] = value end
        end
        for key, value in pairs(patch) do current[key] = value end
        local result = cjson.encode(current)
        redis.call('SET', KEYS[1], result)
        return result
      `, 1, `wa:settings:${organizationId}`, JSON.stringify(DEFAULT_SETTINGS), JSON.stringify(settings));
      return JSON.parse(String(raw));
    } catch {
      throw new ServiceUnavailableException('WhatsApp notification settings could not be saved. Retry.');
    }
  }
}

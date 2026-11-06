import { WhatsAppTemplateService } from './whatsapp-template.service';
import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { OrganizationModule } from '../organization/organization.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AuditModule } from '../audit/audit.module';
import { WHATSAPP_PROVIDER } from './interfaces/whatsapp-provider.interface';
import { WahaWhatsAppProvider } from './providers/waha-whatsapp.provider';
import { MockWhatsAppProvider } from './providers/mock-whatsapp.provider';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppWebhookController } from './whatsapp.controller';
import { AdminWhatsAppController } from './admin-whatsapp.controller';
import { WhatsAppEventsService } from './whatsapp-events.service';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => OrganizationModule),
    AuthorizationModule,
    AuditModule,
  ],
  controllers: [WhatsAppWebhookController, AdminWhatsAppController],
  providers: [
    {
      provide: WHATSAPP_PROVIDER,
      useFactory: () => {
        const mode = process.env.WHATSAPP_PROVIDER?.toLowerCase();
        if (mode === 'mock') {
          return new MockWhatsAppProvider();
        }
        return new WahaWhatsAppProvider();
      },
    },
    WhatsAppService,
    WhatsAppTemplateService,
    WhatsAppEventsService,
  ],
  exports: [WhatsAppService, WhatsAppEventsService, WHATSAPP_PROVIDER],
})
export class WhatsAppModule {}

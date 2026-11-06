import { BusinessNotificationEventsModule } from '../notifications/delivery/business-notification-events';
import { Module } from '@nestjs/common';
import { ComplaintController } from './complaint.controller';
import { ComplaintService } from './complaint.service';
import { DatabaseModule } from '../database/database.module';
import { OrganizationModule } from '../organization/organization.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AuditModule } from '../audit/audit.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    WhatsAppModule,
    BusinessNotificationEventsModule,
    DatabaseModule,
    OrganizationModule,
    AuthorizationModule,
    AuditModule,
  ],
  controllers: [ComplaintController],
  providers: [ComplaintService],
  exports: [ComplaintService],
})
export class ComplaintsModule {}

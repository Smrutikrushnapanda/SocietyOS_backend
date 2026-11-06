import { NoticeWorkflowService } from './notice-workflow.service';
import { NoticeDeliveryAdmission } from './notice-delivery-admission';
import { NoticeRuntimeService } from './notice-runtime.service';
import { FilesModule } from '../files/files.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BusinessNotificationEventsModule } from '../notifications/delivery/business-notification-events';
import { Module } from '@nestjs/common';
import { NoticeController } from './notice.controller';
import { NoticeService } from './notice.service';
import { DatabaseModule } from '../database/database.module';
import { OrganizationModule } from '../organization/organization.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    FilesModule, WhatsAppModule, NotificationsModule,
    BusinessNotificationEventsModule,
    DatabaseModule,
    OrganizationModule,
    AuthorizationModule,
    AuditModule,
  ],
  controllers: [NoticeController],
  providers: [NoticeService, NoticeWorkflowService, NoticeDeliveryAdmission, NoticeRuntimeService],
  exports: [NoticeService],
})
export class NoticesModule {}

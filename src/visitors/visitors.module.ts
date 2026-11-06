import { VisitorLiveModule } from './live/visitor-live.module';
import { BusinessNotificationEventsModule } from '../notifications/delivery/business-notification-events';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { OrganizationModule } from '../organization/organization.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AuditModule } from '../audit/audit.module';
import { VisitorService } from './visitor.service';
import { VisitorVisitService } from './visitor-visit.service';
import { VisitorApprovalService } from './visitor-approval.service';
import { VisitorPassService } from './visitor-pass.service';
import { VisitorController } from './visitor.controller';
import { VisitorVisitController } from './visitor-visit.controller';
import { VisitorApprovalController } from './visitor-approval.controller';
import { VisitorPassController } from './visitor-pass.controller';

import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    VisitorLiveModule,
    BusinessNotificationEventsModule,
    DatabaseModule,
    OrganizationModule,
    AuthorizationModule,
    AuditModule,
    WhatsAppModule,
  ],
  providers: [
    VisitorService,
    VisitorVisitService,
    VisitorApprovalService,
    VisitorPassService,
  ],
  controllers: [
    VisitorController,
    VisitorVisitController,
    VisitorApprovalController,
    VisitorPassController,
  ],
  exports: [
    VisitorService,
    VisitorVisitService,
    VisitorApprovalService,
    VisitorPassService,
  ],
})
export class VisitorsModule {}

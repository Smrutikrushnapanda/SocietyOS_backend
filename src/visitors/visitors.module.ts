import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { OrganizationModule } from '../organization/organization.module';
import { AuditModule } from '../audit/audit.module';
import { VisitorService } from './visitor.service';
import { VisitorVisitService } from './visitor-visit.service';
import { VisitorApprovalService } from './visitor-approval.service';
import { VisitorPassService } from './visitor-pass.service';
import { VisitorController } from './visitor.controller';
import { VisitorVisitController } from './visitor-visit.controller';
import { VisitorApprovalController } from './visitor-approval.controller';
import { VisitorPassController } from './visitor-pass.controller';

@Module({
  imports: [DatabaseModule, OrganizationModule, AuditModule],
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

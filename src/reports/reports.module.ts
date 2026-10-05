import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { OrganizationModule } from '../organization/organization.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { ReportsService } from './reports.service';
import { ReportAuthorizationGuard } from './reports.guard';
import { ReportsController } from './reports.controller';

/**
 * Phase 10 — Step 3 (Reports Foundation).
 * Read-only, organization-scoped reports. AuditModule is intentionally NOT
 * imported: reports never create audit logs.
 */
@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => OrganizationModule),
    AuthorizationModule,
  ],
  providers: [ReportsService, ReportAuthorizationGuard],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}

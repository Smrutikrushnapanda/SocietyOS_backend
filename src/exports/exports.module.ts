import { Module, forwardRef } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { ReportsModule } from '../reports/reports.module';
import { ExportsService } from './exports.service';
import { ExportAuthorizationGuard } from './exports.guard';
import { ExportsController } from './exports.controller';

/**
 * Phase 10 - Step 4 (CSV Exports).
 *
 * Reuses ReportsModule so there is a single reporting/query implementation.
 * AuditModule is intentionally NOT imported: exports never create audit logs.
 */
@Module({
  imports: [
    forwardRef(() => OrganizationModule),
    AuthorizationModule,
    ReportsModule,
  ],
  providers: [ExportsService, ExportAuthorizationGuard],
  controllers: [ExportsController],
  exports: [ExportsService],
})
export class ExportsModule {}

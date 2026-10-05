import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { OrganizationModule } from '../organization/organization.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AuditService } from './audit.service';
import { AuditSanitizer } from './audit-sanitizer';
import { AuditAuthorizationGuard } from './audit.guard';
import { AuditController } from './audit.controller';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => OrganizationModule),
    AuthorizationModule,
  ],
  providers: [AuditService, AuditSanitizer, AuditAuthorizationGuard],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}

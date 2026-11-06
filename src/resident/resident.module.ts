import { Module } from '@nestjs/common';
import { ResidentController } from './resident.controller';
import { ResidentAppAccessController } from './resident.app-access.controller';
import { ResidentService } from './resident.service';
import { DatabaseModule } from '../database/database.module';
import { OrganizationModule } from '../organization/organization.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DatabaseModule, OrganizationModule, AuthorizationModule, AuditModule],
  controllers: [ResidentController, ResidentAppAccessController],
  providers: [ResidentService],
  exports: [ResidentService],
})
export class ResidentModule {}

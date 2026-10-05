import { Module } from '@nestjs/common';
import { ComplaintController } from './complaint.controller';
import { ComplaintService } from './complaint.service';
import { DatabaseModule } from '../database/database.module';
import { OrganizationModule } from '../organization/organization.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DatabaseModule, OrganizationModule, AuditModule],
  controllers: [ComplaintController],
  providers: [ComplaintService],
  exports: [ComplaintService],
})
export class ComplaintsModule {}

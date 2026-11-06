import { Module } from '@nestjs/common';
import { PollController } from './poll.controller';
import { PollService } from './poll.service';
import { DatabaseModule } from '../database/database.module';
import { OrganizationModule } from '../organization/organization.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AuditModule } from '../audit/audit.module';
import { PollDeliveryAdmission } from './poll-delivery-admission';

@Module({
  imports: [DatabaseModule, OrganizationModule, AuthorizationModule, AuditModule],
  controllers: [PollController],
  providers: [PollService, PollDeliveryAdmission],
  exports: [PollService],
})
export class PollsModule {}

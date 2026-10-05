import { Module } from '@nestjs/common';
import { PollController } from './poll.controller';
import { PollService } from './poll.service';
import { DatabaseModule } from '../database/database.module';
import { OrganizationModule } from '../organization/organization.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DatabaseModule, OrganizationModule, AuditModule],
  controllers: [PollController],
  providers: [PollService],
  exports: [PollService],
})
export class PollsModule {}

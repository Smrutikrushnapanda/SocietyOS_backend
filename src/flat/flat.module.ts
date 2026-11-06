import { Module } from '@nestjs/common';
import { FlatController } from './flat.controller';
import { FlatService } from './flat.service';
import { DatabaseModule } from '../database/database.module';
import { OrganizationModule } from '../organization/organization.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DatabaseModule, OrganizationModule, AuthorizationModule, AuditModule],
  controllers: [FlatController],
  providers: [FlatService],
  exports: [FlatService],
})
export class FlatModule {}

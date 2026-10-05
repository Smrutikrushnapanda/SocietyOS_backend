import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { OrganizationContextService } from './organization-context.service';
import { OrganizationGuard } from './organization.guard';

@Module({
  imports: [DatabaseModule],
  providers: [OrganizationContextService, OrganizationGuard],
  exports: [OrganizationContextService],
})
export class OrganizationModule {}

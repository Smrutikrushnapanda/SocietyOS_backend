import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { OrganizationContextService } from './organization-context.service';
import { OrganizationGuard } from './organization.guard';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';

@Module({
  imports: [DatabaseModule, AuthorizationModule],
  controllers: [OrganizationController],
  providers: [
    OrganizationContextService,
    OrganizationGuard,
    OrganizationService,
  ],
  exports: [OrganizationContextService, OrganizationService],
})
export class OrganizationModule {}

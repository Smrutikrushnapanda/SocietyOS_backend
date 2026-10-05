import { Module, forwardRef } from '@nestjs/common';
import { BuildingController } from './building.controller';
import { BuildingService } from './building.service';
import { DatabaseModule } from '../database/database.module';
import { OrganizationModule } from '../organization/organization.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    DatabaseModule,
    OrganizationModule,
    forwardRef(() => AuditModule),
  ],
  controllers: [BuildingController],
  providers: [BuildingService],
  exports: [BuildingService],
})
export class BuildingModule {}

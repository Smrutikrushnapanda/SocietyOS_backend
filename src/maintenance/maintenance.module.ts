import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MaintenanceConfigurationService } from './maintenance-configuration.service';
import { MaintenanceDueService } from './maintenance-due.service';
import { PaymentService } from './payment.service';
import { OrganizationModule } from '../organization/organization.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DatabaseModule, OrganizationModule, AuditModule],
  providers: [
    MaintenanceConfigurationService,
    MaintenanceDueService,
    PaymentService,
  ],
  exports: [
    MaintenanceConfigurationService,
    MaintenanceDueService,
    PaymentService,
  ],
})
export class MaintenanceModule {}

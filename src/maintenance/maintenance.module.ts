import { MaintenanceAccrualService } from './maintenance-accrual.service';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MaintenanceConfigurationService } from './maintenance-configuration.service';
import { MaintenanceDueService } from './maintenance-due.service';
import { PaymentService } from './payment.service';
import { OrganizationModule } from '../organization/organization.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AuditModule } from '../audit/audit.module';
import { MaintenanceController } from './maintenance.controller';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    WhatsAppModule,
    DatabaseModule,
    OrganizationModule,
    AuthorizationModule,
    AuditModule,
  ],
  controllers: [MaintenanceController],
  providers: [
    MaintenanceAccrualService,
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

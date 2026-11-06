import { SocietySettingsModule } from './society-settings/settings.module';
import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { ConfigModule } from './config/config.module';
import { HealthController } from './health/health.controller';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { OrganizationModule } from './organization/organization.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { BuildingModule } from './building/building.module';
import { FloorModule } from './floor/floor.module';
import { FlatModule } from './flat/flat.module';
import { ResidentModule } from './resident/resident.module';
import { VisitorsModule } from './visitors/visitors.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { NoticesModule } from './notices/notices.module';
import { PollsModule } from './polls/polls.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FilesModule } from './files/files.module';
import { AuditModule } from './audit/audit.module';
import { ReportsModule } from './reports/reports.module';
import { ExportsModule } from './exports/exports.module';
import { VehicleModule } from './vehicle/vehicle.module';
import { ParkingModule } from './parking/parking.module';
import { VendorsModule } from './vendors/vendors.module';
import { AmenitiesModule } from './amenities/amenities.module';
import { StaffModule } from './staff/staff.module';
import { RoleAdminMenuModule } from './role-admin-menu/role-admin-menu.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { WeatherModule } from './weather/weather.module';

@Module({
  imports: [
    SocietySettingsModule,
    DatabaseModule,
    RedisModule,
    ConfigModule,
    AuthModule,
    AuthorizationModule,
    OrganizationModule,
    MaintenanceModule,
    BuildingModule,
    FloorModule,
    FlatModule,
    ResidentModule,
    VisitorsModule,
    ComplaintsModule,
    NoticesModule,
    PollsModule,
    NotificationsModule,
    FilesModule,
    AuditModule,
    ReportsModule,
    ExportsModule,
    VehicleModule,
    ParkingModule,
    VendorsModule,
    AmenitiesModule,
    StaffModule,
    RoleAdminMenuModule,
    WhatsAppModule,
    WeatherModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}

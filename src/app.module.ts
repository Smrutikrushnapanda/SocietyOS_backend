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

@Module({
  imports: [
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
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}

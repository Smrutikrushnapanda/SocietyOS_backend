"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("./database/database.module");
const redis_module_1 = require("./redis/redis.module");
const config_module_1 = require("./config/config.module");
const health_controller_1 = require("./health/health.controller");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_module_1 = require("./auth/auth.module");
const authorization_module_1 = require("./authorization/authorization.module");
const organization_module_1 = require("./organization/organization.module");
const maintenance_module_1 = require("./maintenance/maintenance.module");
const building_module_1 = require("./building/building.module");
const floor_module_1 = require("./floor/floor.module");
const flat_module_1 = require("./flat/flat.module");
const resident_module_1 = require("./resident/resident.module");
const visitors_module_1 = require("./visitors/visitors.module");
const complaints_module_1 = require("./complaints/complaints.module");
const notices_module_1 = require("./notices/notices.module");
const polls_module_1 = require("./polls/polls.module");
const notifications_module_1 = require("./notifications/notifications.module");
const files_module_1 = require("./files/files.module");
const audit_module_1 = require("./audit/audit.module");
const reports_module_1 = require("./reports/reports.module");
const exports_module_1 = require("./exports/exports.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            database_module_1.DatabaseModule,
            redis_module_1.RedisModule,
            config_module_1.ConfigModule,
            auth_module_1.AuthModule,
            authorization_module_1.AuthorizationModule,
            organization_module_1.OrganizationModule,
            maintenance_module_1.MaintenanceModule,
            building_module_1.BuildingModule,
            floor_module_1.FloorModule,
            flat_module_1.FlatModule,
            resident_module_1.ResidentModule,
            visitors_module_1.VisitorsModule,
            complaints_module_1.ComplaintsModule,
            notices_module_1.NoticesModule,
            polls_module_1.PollsModule,
            notifications_module_1.NotificationsModule,
            files_module_1.FilesModule,
            audit_module_1.AuditModule,
            reports_module_1.ReportsModule,
            exports_module_1.ExportsModule,
        ],
        controllers: [app_controller_1.AppController, health_controller_1.HealthController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
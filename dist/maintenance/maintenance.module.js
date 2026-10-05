"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaintenanceModule = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../database/database.module");
const maintenance_configuration_service_1 = require("./maintenance-configuration.service");
const maintenance_due_service_1 = require("./maintenance-due.service");
const payment_service_1 = require("./payment.service");
const organization_module_1 = require("../organization/organization.module");
const audit_module_1 = require("../audit/audit.module");
let MaintenanceModule = class MaintenanceModule {
};
exports.MaintenanceModule = MaintenanceModule;
exports.MaintenanceModule = MaintenanceModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, organization_module_1.OrganizationModule, audit_module_1.AuditModule],
        providers: [
            maintenance_configuration_service_1.MaintenanceConfigurationService,
            maintenance_due_service_1.MaintenanceDueService,
            payment_service_1.PaymentService,
        ],
        exports: [
            maintenance_configuration_service_1.MaintenanceConfigurationService,
            maintenance_due_service_1.MaintenanceDueService,
            payment_service_1.PaymentService,
        ],
    })
], MaintenanceModule);
//# sourceMappingURL=maintenance.module.js.map
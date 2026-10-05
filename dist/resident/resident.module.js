"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResidentModule = void 0;
const common_1 = require("@nestjs/common");
const resident_controller_1 = require("./resident.controller");
const resident_app_access_controller_1 = require("./resident.app-access.controller");
const resident_service_1 = require("./resident.service");
const database_module_1 = require("../database/database.module");
const organization_module_1 = require("../organization/organization.module");
const audit_module_1 = require("../audit/audit.module");
let ResidentModule = class ResidentModule {
};
exports.ResidentModule = ResidentModule;
exports.ResidentModule = ResidentModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, organization_module_1.OrganizationModule, audit_module_1.AuditModule],
        controllers: [resident_controller_1.ResidentController, resident_app_access_controller_1.ResidentAppAccessController],
        providers: [resident_service_1.ResidentService],
        exports: [resident_service_1.ResidentService],
    })
], ResidentModule);
//# sourceMappingURL=resident.module.js.map
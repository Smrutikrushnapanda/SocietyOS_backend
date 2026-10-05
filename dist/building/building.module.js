"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildingModule = void 0;
const common_1 = require("@nestjs/common");
const building_controller_1 = require("./building.controller");
const building_service_1 = require("./building.service");
const database_module_1 = require("../database/database.module");
const organization_module_1 = require("../organization/organization.module");
const audit_module_1 = require("../audit/audit.module");
let BuildingModule = class BuildingModule {
};
exports.BuildingModule = BuildingModule;
exports.BuildingModule = BuildingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            database_module_1.DatabaseModule,
            organization_module_1.OrganizationModule,
            (0, common_1.forwardRef)(() => audit_module_1.AuditModule),
        ],
        controllers: [building_controller_1.BuildingController],
        providers: [building_service_1.BuildingService],
        exports: [building_service_1.BuildingService],
    })
], BuildingModule);
//# sourceMappingURL=building.module.js.map
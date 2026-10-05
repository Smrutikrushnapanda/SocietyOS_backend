"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportsModule = void 0;
const common_1 = require("@nestjs/common");
const organization_module_1 = require("../organization/organization.module");
const authorization_module_1 = require("../authorization/authorization.module");
const reports_module_1 = require("../reports/reports.module");
const exports_service_1 = require("./exports.service");
const exports_guard_1 = require("./exports.guard");
const exports_controller_1 = require("./exports.controller");
let ExportsModule = class ExportsModule {
};
exports.ExportsModule = ExportsModule;
exports.ExportsModule = ExportsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            (0, common_1.forwardRef)(() => organization_module_1.OrganizationModule),
            authorization_module_1.AuthorizationModule,
            reports_module_1.ReportsModule,
        ],
        providers: [exports_service_1.ExportsService, exports_guard_1.ExportAuthorizationGuard],
        controllers: [exports_controller_1.ExportsController],
        exports: [exports_service_1.ExportsService],
    })
], ExportsModule);
//# sourceMappingURL=exports.module.js.map
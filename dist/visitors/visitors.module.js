"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisitorsModule = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../database/database.module");
const organization_module_1 = require("../organization/organization.module");
const audit_module_1 = require("../audit/audit.module");
const visitor_service_1 = require("./visitor.service");
const visitor_visit_service_1 = require("./visitor-visit.service");
const visitor_approval_service_1 = require("./visitor-approval.service");
const visitor_pass_service_1 = require("./visitor-pass.service");
const visitor_controller_1 = require("./visitor.controller");
const visitor_visit_controller_1 = require("./visitor-visit.controller");
const visitor_approval_controller_1 = require("./visitor-approval.controller");
const visitor_pass_controller_1 = require("./visitor-pass.controller");
let VisitorsModule = class VisitorsModule {
};
exports.VisitorsModule = VisitorsModule;
exports.VisitorsModule = VisitorsModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, organization_module_1.OrganizationModule, audit_module_1.AuditModule],
        providers: [
            visitor_service_1.VisitorService,
            visitor_visit_service_1.VisitorVisitService,
            visitor_approval_service_1.VisitorApprovalService,
            visitor_pass_service_1.VisitorPassService,
        ],
        controllers: [
            visitor_controller_1.VisitorController,
            visitor_visit_controller_1.VisitorVisitController,
            visitor_approval_controller_1.VisitorApprovalController,
            visitor_pass_controller_1.VisitorPassController,
        ],
        exports: [
            visitor_service_1.VisitorService,
            visitor_visit_service_1.VisitorVisitService,
            visitor_approval_service_1.VisitorApprovalService,
            visitor_pass_service_1.VisitorPassService,
        ],
    })
], VisitorsModule);
//# sourceMappingURL=visitors.module.js.map
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationContextService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const organization_entity_1 = require("../database/entities/organization.entity");
let OrganizationContextService = class OrganizationContextService {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async getCurrentOrganization(request) {
        const userId = request.user?.id ?? null;
        if (!userId) {
            return {
                userId: null,
                organizationId: null,
                isSuperAdmin: false,
                isCrossOrganization: false,
                targetOrganizationId: null,
            };
        }
        const userRoleRepository = this.dataSource.getRepository('UserRole');
        const userRole = await userRoleRepository.findOneBy({
            userId: userId,
        });
        if (!userRole) {
            return {
                userId: userId,
                organizationId: null,
                isSuperAdmin: false,
                isCrossOrganization: false,
                targetOrganizationId: null,
            };
        }
        const roleRepository = this.dataSource.getRepository('Role');
        const role = await roleRepository.findOneBy({ id: userRole.roleId });
        const isSuperAdmin = role?.name === 'SUPER_ADMIN';
        let organizationId = null;
        let targetOrganizationId = null;
        if (isSuperAdmin) {
            const headerOrgId = request.headers['x-organization-id'];
            targetOrganizationId = headerOrgId ? String(headerOrgId) : null;
            if (targetOrganizationId) {
                const orgRepository = this.dataSource.getRepository(organization_entity_1.Organization);
                const organization = await orgRepository.findOneBy({
                    id: targetOrganizationId,
                });
                if (organization && organization.isActive) {
                    organizationId = targetOrganizationId;
                }
            }
        }
        else {
            organizationId = userRole.organization_id
                ? String(userRole.organization_id)
                : null;
        }
        const crossOrg = isSuperAdmin &&
            targetOrganizationId !== null &&
            organizationId !== targetOrganizationId;
        return {
            userId: userId,
            organizationId,
            isSuperAdmin,
            isCrossOrganization: crossOrg,
            targetOrganizationId,
        };
    }
    async getOrganizationId(request) {
        const context = await this.getCurrentOrganization(request);
        return context.organizationId;
    }
    async getTargetOrganizationId(request) {
        const context = await this.getCurrentOrganization(request);
        return context.targetOrganizationId;
    }
    async isSuperAdmin(request) {
        const context = await this.getCurrentOrganization(request);
        return context.isSuperAdmin;
    }
    async isCrossOrganization(request) {
        const context = await this.getCurrentOrganization(request);
        return context.isCrossOrganization;
    }
};
exports.OrganizationContextService = OrganizationContextService;
exports.OrganizationContextService = OrganizationContextService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], OrganizationContextService);
//# sourceMappingURL=organization-context.service.js.map
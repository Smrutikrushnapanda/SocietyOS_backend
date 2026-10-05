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
exports.AuthorizationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const role_entity_1 = require("../database/entities/role.entity");
const user_role_entity_1 = require("../database/entities/user-role.entity");
let AuthorizationService = class AuthorizationService {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async getUserRole(userId) {
        const userRoleRepository = this.dataSource.getRepository(user_role_entity_1.UserRole);
        const userRole = await userRoleRepository.findOneBy({ userId });
        if (!userRole) {
            return null;
        }
        const roleRepository = this.dataSource.getRepository(role_entity_1.Role);
        const role = await roleRepository.findOneBy({ id: userRole.roleId });
        if (!role) {
            return null;
        }
        return { userRole, role };
    }
    async getUserPermissions(userId, targetOrganizationId) {
        const result = await this.getUserRole(userId);
        if (!result) {
            return { role: null, permissions: [], organizationId: null };
        }
        const { userRole, role } = result;
        if (role.name === 'SUPER_ADMIN') {
            const rolePermissionRepository = this.dataSource.getRepository('RolePermission');
            const rows = await rolePermissionRepository.query(`SELECT rp.*, p.name as permission_name, p.is_active as permission_is_active FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id WHERE rp.role_id = $1`, [role.id]);
            const permissions = [];
            for (let i = 0; i < rows.length; i++) {
                const rp = rows[i];
                if (rp.permission_is_active === 1) {
                    permissions.push(rp.permission_name);
                }
            }
            return { role, permissions, organizationId: userRole.organization_id };
        }
        if (userRole.organization_id == null) {
            return { role, permissions: [], organizationId: null };
        }
        const effectiveOrganizationId = targetOrganizationId || userRole.organization_id;
        const rolePermissionRepository = this.dataSource.getRepository('RolePermission');
        const rows = await rolePermissionRepository.query(`SELECT rp.*, p.name as permission_name, p.is_active as permission_is_active FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id WHERE rp.role_id = $1`, [role.id]);
        const permissions = [];
        for (let i = 0; i < rows.length; i++) {
            const rp = rows[i];
            if (rp.permission_is_active === 1) {
                permissions.push(rp.permission_name);
            }
        }
        return { role, permissions, organizationId: effectiveOrganizationId };
    }
    async hasPermission(userId, permissionName, targetOrganizationId) {
        const { permissions } = await this.getUserPermissions(userId, targetOrganizationId);
        if (permissions.length === 0) {
            return false;
        }
        return permissions.includes(permissionName);
    }
    async canAccessOrganization(userId, organizationId) {
        const result = await this.getUserRole(userId);
        if (!result) {
            return false;
        }
        const { role } = result;
        if (role.name === 'SUPER_ADMIN') {
            return true;
        }
        const userOrganizationId = result.userRole.organization_id;
        return userOrganizationId === organizationId;
    }
    async getUserRoleName(userId) {
        const result = await this.getUserRole(userId);
        if (!result) {
            return null;
        }
        const { role } = result;
        return role.name;
    }
    async verifyPermission(userId, permissionName, targetOrganizationId) {
        const { permissions, organizationId: effectiveOrganizationId } = await this.getUserPermissions(userId, targetOrganizationId);
        const roleName = await this.getUserRoleName(userId);
        return {
            allowed: permissions.includes(permissionName),
            role: roleName || 'UNKNOWN',
            organizationId: effectiveOrganizationId,
        };
    }
};
exports.AuthorizationService = AuthorizationService;
exports.AuthorizationService = AuthorizationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], AuthorizationService);
//# sourceMappingURL=authorization.service.js.map
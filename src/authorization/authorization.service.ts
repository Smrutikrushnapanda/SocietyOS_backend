import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Role } from '../database/entities/role.entity';
import { UserRole } from '../database/entities/user-role.entity';

@Injectable()
export class AuthorizationService {
  constructor(private readonly dataSource: DataSource) {}

  async getUserRole(userId: string) {
    const userRoleRepository = this.dataSource.getRepository(UserRole);
    const userRole = await userRoleRepository.findOneBy({ userId });

    if (!userRole) {
      return null;
    }

    const roleRepository = this.dataSource.getRepository(Role);
    const role = await roleRepository.findOneBy({ id: userRole.roleId });

    if (!role) {
      return null;
    }

    return { userRole, role };
  }

  async getUserPermissions(
    userId: string,
    targetOrganizationId?: string,
  ): Promise<{
    role: Role | null;
    permissions: string[];
    organizationId: string | null;
  }> {
    const result = await this.getUserRole(userId);
    if (!result) {
      return { role: null, permissions: [], organizationId: null };
    }

    const { userRole, role } = result;

    if (role.name === 'SUPER_ADMIN') {
      const rolePermissionRepository =
        this.dataSource.getRepository('RolePermission');
      const rows = await rolePermissionRepository.query(
        `SELECT rp.*, p.name as permission_name, p.is_active as permission_is_active FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id WHERE rp.role_id = $1`,
        [role.id],
      );

      const permissions: string[] = [];
      for (let i = 0; i < rows.length; i++) {
        const rp: any = rows[i];
        if (rp.permission_is_active === 1) {
          permissions.push(rp.permission_name);
        }
      }

      return { role, permissions, organizationId: userRole.organization_id };
    }

    if (userRole.organization_id == null) {
      return { role, permissions: [], organizationId: null };
    }

    const effectiveOrganizationId =
      targetOrganizationId || userRole.organization_id;

    const rolePermissionRepository =
      this.dataSource.getRepository('RolePermission');
    const rows = await rolePermissionRepository.query(
      `SELECT rp.*, p.name as permission_name, p.is_active as permission_is_active FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id WHERE rp.role_id = $1`,
      [role.id],
    );

    const permissions: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const rp: any = rows[i];
      if (rp.permission_is_active === 1) {
        permissions.push(rp.permission_name);
      }
    }

    return { role, permissions, organizationId: effectiveOrganizationId };
  }

  async hasPermission(
    userId: string,
    permissionName: string,
    targetOrganizationId?: string,
  ): Promise<boolean> {
    const { permissions } = await this.getUserPermissions(
      userId,
      targetOrganizationId,
    );

    if (permissions.length === 0) {
      return false;
    }

    return permissions.includes(permissionName);
  }

  async canAccessOrganization(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
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

  async getUserRoleName(userId: string): Promise<string | null> {
    const result = await this.getUserRole(userId);
    if (!result) {
      return null;
    }
    const { role } = result;
    return role.name;
  }

  async verifyPermission(
    userId: string,
    permissionName: string,
    targetOrganizationId?: string,
  ): Promise<{
    allowed: boolean;
    role: string;
    organizationId: string | null;
  }> {
    const { permissions, organizationId: effectiveOrganizationId } =
      await this.getUserPermissions(userId, targetOrganizationId);
    const roleName = await this.getUserRoleName(userId);

    return {
      allowed: permissions.includes(permissionName),
      role: roleName || 'UNKNOWN',
      organizationId: effectiveOrganizationId,
    };
  }
}

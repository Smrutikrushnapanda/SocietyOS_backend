import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Role } from '../database/entities/role.entity';
import { UserRole } from '../database/entities/user-role.entity';

/**
 * Centralized RBAC authorization.
 *
 * Phase 11 Step 2 (RBAC security matrix): membership lookups are now
 * organization-aware. `user_roles` remains the sole source of organization
 * membership:
 *  - SUPER_ADMIN is platform-scoped (organization_id NULL) and may operate on
 *    any organization only through the explicit, validated target
 *    organization (X-Organization-Id, resolved by OrganizationContextService).
 *  - Normal roles require a user_roles row for the target organization.
 *    When a target organization is supplied and the user has NO membership
 *    there, authorization fails closed — there is never a fallback to
 *    another organization's membership.
 *  - A client-supplied organization id is only ever used as the lookup key
 *    for an EXISTING membership; it never grants authorization by itself.
 */
@Injectable()
export class AuthorizationService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Resolve the user's role.
   *
   * When `organizationId` is supplied:
   *  - SUPER_ADMIN (platform-scoped, organization_id NULL) resolves as usual;
   *  - otherwise the user must hold a user_roles membership for that
   *    organization; the membership for that organization is returned
   *    (multi-organization users resolve the correct per-org role).
   *    No membership for the target organization => null (fail-closed,
   *    never a fallback to another organization).
   * When omitted, the first membership is returned (backward-compatible).
   */
  async getUserRole(userId: string, organizationId?: string) {
    const userRoleRepository = this.dataSource.getRepository(UserRole);
    const roleRepository = this.dataSource.getRepository(Role);

    const userRole = await userRoleRepository.findOneBy({ userId });
    if (!userRole) {
      return null;
    }

    const role = await roleRepository.findOneBy({ id: userRole.roleId });
    if (!role || role.isActive === false) {
      return null;
    }

    if (organizationId) {
      if (role.name === 'SUPER_ADMIN') {
        // Platform-scoped: the target organization is only the operation's
        // scope (validated separately by OrganizationContextService).
        return { userRole, role };
      }
      if (userRole.organization_id === organizationId) {
        return { userRole, role };
      }
      // Multi-organization user: resolve the membership for the target org.
      const membership = await userRoleRepository.findOneBy({
        userId,
        organization_id: organizationId,
      });
      if (!membership) {
        return null;
      }
      const targetRole = await roleRepository.findOneBy({
        id: membership.roleId,
      });
      if (!targetRole || targetRole.isActive === false) {
        return null;
      }
      return { userRole: membership, role: targetRole };
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
    // For SUPER_ADMIN the membership is platform-scoped; the target
    // organization (when supplied) is only the operation's scope.
    const result = targetOrganizationId
      ? await this.getUserRole(userId, targetOrganizationId)
      : await this.getUserRole(userId);

    if (!result) {
      return { role: null, permissions: [], organizationId: null };
    }

    const { userRole, role } = result;

    if (role.name === 'SUPER_ADMIN') {
      const permissions = await this.getRolePermissions(role.id);
      return { role, permissions, organizationId: userRole.organization_id };
    }

    if (userRole.organization_id == null) {
      return { role, permissions: [], organizationId: null };
    }

    // Normal organization role: permissions are only valid for the
    // organization the membership belongs to. When a target organization was
    // supplied, the membership lookup above already guaranteed it matches;
    // when it was not, the membership's own organization applies.
    const effectiveOrganizationId =
      targetOrganizationId || userRole.organization_id;

    const permissions = await this.getRolePermissions(role.id);

    return { role, permissions, organizationId: effectiveOrganizationId };
  }

  async getRolePermissions(roleId: string): Promise<string[]> {
    const rolePermissionRepository =
      this.dataSource.getRepository('RolePermission');
    const rows = await rolePermissionRepository.query(
      `SELECT rp.*, p.name as permission_name, p.is_active as permission_is_active FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id WHERE rp.role_id = $1`,
      [roleId],
    );

    const permissions: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const rp: any = rows[i];
      if (rp.permission_is_active === 1 || rp.permission_is_active === true) {
        permissions.push(rp.permission_name);
      }
    }
    return permissions;
  }

  /**
   * Phase 12 Step 5A: Retrieve all organization memberships and their permissions
   * for the authenticated user from user_roles.
   *  - SUPER_ADMIN: platform-scoped, organizationId = null
   *  - Normal users: organizationId = user_roles.organization_id
   *  - Permissions are resolved dynamically from role_permissions -> permissions
   */
  async getUserMemberships(userId: string): Promise<
    Array<{
      organizationId: string | null;
      role: string;
      permissions: string[];
    }>
  > {
    const userRoleRepository = this.dataSource.getRepository(UserRole);
    const roleRepository = this.dataSource.getRepository(Role);

    const allUserRoles = await userRoleRepository.findBy({ userId });
    const memberships: Array<{
      organizationId: string | null;
      role: string;
      permissions: string[];
    }> = [];

    for (const ur of allUserRoles) {
      const role = await roleRepository.findOneBy({ id: ur.roleId });
      if (!role || role.isActive === false) {
        continue;
      }
      const permissions = await this.getRolePermissions(role.id);
      memberships.push({
        organizationId: ur.organization_id ?? null,
        role: role.name,
        permissions,
      });
    }

    return memberships;
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

  /**
   * Does the user have a membership in the given organization?
   * SUPER_ADMIN is platform-scoped and may target any organization
   * (target validity is enforced by OrganizationContextService).
   */
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

    const membership = await this.dataSource
      .getRepository(UserRole)
      .findOneBy({ userId, organization_id: organizationId });
    return membership != null;
  }

  async getUserRoleName(userId: string): Promise<string | null> {
    const result = await this.getUserRole(userId);
    if (!result) {
      return null;
    }
    return result.role.name;
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

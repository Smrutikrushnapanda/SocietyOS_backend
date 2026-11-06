import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Organization } from '../database/entities/organization.entity';

export type OrganizationContext = {
  userId: string | null;
  organizationId: string | null;
  /**
   * Phase 11 Step 2: snake_case alias of `organizationId`.
   * Several Phase 5/6/7 services read `orgContext.organization_id`; the alias
   * keeps those reads correct without redesigning the context shape.
   */
  organization_id: string | null;
  isSuperAdmin: boolean;
  isCrossOrganization: boolean;
  targetOrganizationId: string | null;
};

type AuthRequest = Request & { user: { id: string; mobileNumber?: string } };

@Injectable()
export class OrganizationContextService {
  constructor(private readonly dataSource: DataSource) {}

  async getCurrentOrganization(
    request: AuthRequest,
  ): Promise<OrganizationContext> {
    const userId = request.user?.id ?? null;

    if (!userId) {
      return {
        userId: null,
        organizationId: null,
        organization_id: null,
        isSuperAdmin: false,
        isCrossOrganization: false,
        targetOrganizationId: null,
      };
    }

    const userRoleRepository = this.dataSource.getRepository('UserRole');
    const roleRepository = this.dataSource.getRepository('Role');

    // Look up ALL user roles (a user can have multiple memberships).
    const allUserRoles = await userRoleRepository.findBy({ userId: userId });

    // Determine if the user holds the SUPER_ADMIN role in any organization.
    // SUPER_ADMIN is platform-scoped (organization_id NULL).
    let isSuperAdmin = false;

    for (const ur of allUserRoles) {
      const r = await roleRepository.findOneBy({ id: ur.roleId });
      if (r && r.name === 'SUPER_ADMIN' && ur.organization_id === null) {
        isSuperAdmin = true;
        break;
      }
    }

    // Extract organization_id and role name from each membership.
    const memberships = allUserRoles.map(async (ur) => {
      const r = await roleRepository.findOneBy({ id: ur.roleId });
      return {
        organization_id: ur.organization_id ?? null,
        roleName: r?.name ?? null,
      };
    });

    // Resolve all memberships to a parallel array.
    const membershipsResolved = await Promise.all(memberships);

    // Determine the target organization from the X-Organization-Id header.
    // This header is honored ONLY for users who have an actual membership
    // in the specified organization; otherwise it is ignored (fail-closed).
    const headerOrgId = (request.headers as any)['x-organization-id'];
    const requestedOrgId = headerOrgId ? String(headerOrgId) : null;

    let organizationId: string | null = null;
    let targetOrganizationId: string | null = null;

    if (isSuperAdmin) {
      // SUPER_ADMIN: the target organization comes from the validated header.
      targetOrganizationId = requestedOrgId;

      if (targetOrganizationId) {
        try {
          const orgRepository = this.dataSource.getRepository(Organization);
          const organization = await orgRepository.findOneBy({
            id: targetOrganizationId,
          });
          if (organization && organization.isActive) {
            organizationId = targetOrganizationId;
          } else {
            organizationId = null;
            targetOrganizationId = null;
          }
        } catch {
          organizationId = null;
          targetOrganizationId = null;
        }
      }
    } else {
      // Normal user (no SUPER_ADMIN membership).
      if (requestedOrgId) {
        // The user supplied X-Organization-Id. Honor it only if the user
        // has a membership in that organization; otherwise fail-closed.
        const hasMembership = membershipsResolved.some(
          (m) => m.organization_id === requestedOrgId,
        );
        if (hasMembership) {
          // Find the role name for the requested organization.
          const requestedMembership = membershipsResolved.find(
            (m) => m.organization_id === requestedOrgId,
          );
          const requestedRole = requestedMembership?.roleName
            ? await roleRepository.findOneBy({
                name: requestedMembership.roleName,
              })
            : null;
          if (requestedRole) {
            organizationId = requestedOrgId;
            targetOrganizationId = requestedOrgId;
          }
        }
        // If the user does NOT have a membership in the requested org,
        // organizationId stays null → fail-closed (no fallback).
      } else {
        // No X-Organization-Id supplied: use the user's first
        // non-SUPER_ADMIN membership (deterministic: first in DB order).
        const firstNonSuper = membershipsResolved.find(
          (m) => m.roleName !== 'SUPER_ADMIN',
        );
        if (firstNonSuper) {
          organizationId = firstNonSuper.organization_id ?? null;
        }
        // If the user has no memberships at all, organizationId stays null
        // → fail-closed in guards.
      }

      // Validate that the resolved organization actually exists and is active.
      if (organizationId) {
        try {
          const orgRepository = this.dataSource.getRepository(Organization);
          const organization = await orgRepository.findOneBy({
            id: organizationId,
          });
          if (!organization || !organization.isActive) {
            organizationId = null;
            targetOrganizationId = null;
          }
        } catch {
          organizationId = null;
          targetOrganizationId = null;
        }
      }
    }

    const crossOrg =
      isSuperAdmin &&
      targetOrganizationId !== null &&
      organizationId !== targetOrganizationId;

    return {
      userId: userId,
      organizationId,
      organization_id: organizationId,
      isSuperAdmin,
      isCrossOrganization: crossOrg,
      targetOrganizationId,
    };
  }

  async getOrganizationId(request: AuthRequest): Promise<string | null> {
    const context = await this.getCurrentOrganization(request);
    return context.organizationId;
  }

  async getTargetOrganizationId(request: AuthRequest): Promise<string | null> {
    const context = await this.getCurrentOrganization(request);
    return context.targetOrganizationId;
  }

  async isSuperAdmin(request: AuthRequest): Promise<boolean> {
    const context = await this.getCurrentOrganization(request);
    return context.isSuperAdmin;
  }
}

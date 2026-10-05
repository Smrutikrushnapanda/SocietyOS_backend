import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Organization } from '../database/entities/organization.entity';

export type OrganizationContext = {
  userId: string | null;
  organizationId: string | null;
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

    let organizationId: string | null = null;
    let targetOrganizationId: string | null = null;

    if (isSuperAdmin) {
      const headerOrgId = (request.headers as any)['x-organization-id'];
      targetOrganizationId = headerOrgId ? String(headerOrgId) : null;

      if (targetOrganizationId) {
        const orgRepository = this.dataSource.getRepository(Organization);
        const organization = await orgRepository.findOneBy({
          id: targetOrganizationId,
        });
        if (organization && organization.isActive) {
          organizationId = targetOrganizationId;
        }
      }
    } else {
      organizationId = userRole.organization_id
        ? String(userRole.organization_id)
        : null;
    }

    const crossOrg =
      isSuperAdmin &&
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

  async isCrossOrganization(request: AuthRequest): Promise<boolean> {
    const context = await this.getCurrentOrganization(request);
    return context.isCrossOrganization;
  }
}

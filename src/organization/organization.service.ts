import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { Organization } from '../database/entities/organization.entity';
import { User } from '../database/entities/user.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { ProvisionOrganizationAdminDto } from './dto/provision-organization-admin.dto';
import { OrganizationContext } from './organization-context.service';

@Injectable()
export class OrganizationService {
  constructor(private readonly dataSource: DataSource) {}

  private get repository() {
    return this.dataSource.getRepository(Organization);
  }

  async findAll(orgContext: OrganizationContext): Promise<Organization[]> {
    if (orgContext.isSuperAdmin) {
      return this.repository.find({
        order: { name: 'ASC' },
      });
    }

    if (!orgContext.organizationId) {
      return [];
    }

    const org = await this.repository.findOneBy({
      id: orgContext.organizationId,
    });
    return org ? [org] : [];
  }

  async findOne(
    id: string,
    orgContext: OrganizationContext,
  ): Promise<Organization> {
    if (!orgContext.isSuperAdmin && orgContext.organizationId !== id) {
      throw new ForbiddenException(
        'Access denied to organization outside your membership context',
      );
    }

    const org = await this.repository.findOneBy({ id });
    if (!org) {
      throw new NotFoundException(`Organization with id ${id} not found`);
    }
    return org;
  }

  async create(
    dto: CreateOrganizationDto,
    orgContext: OrganizationContext,
  ): Promise<Organization> {
    if (!orgContext.isSuperAdmin) {
      throw new ForbiddenException(
        'Only SUPER_ADMIN can create new organizations',
      );
    }

    const org = this.repository.create({
      id: randomUUID(),
      name: dto.name,
      identifier: dto.identifier || dto.name,
      address: dto.address || '',
      isActive: true,
    });

    return this.repository.save(org);
  }

  async update(
    id: string,
    dto: UpdateOrganizationDto,
    orgContext: OrganizationContext,
  ): Promise<Organization> {
    const org = await this.findOne(id, orgContext);

    if (dto.name !== undefined) org.name = dto.name;
    if (dto.identifier !== undefined) org.identifier = dto.identifier;
    if (dto.address !== undefined) org.address = dto.address;
    if (dto.isActive !== undefined) {
      if (!orgContext.isSuperAdmin) {
        throw new ForbiddenException(
          'Only SUPER_ADMIN can change organization active status',
        );
      }
      org.isActive = dto.isActive;
    }

    return this.repository.save(org);
  }

  async remove(
    id: string,
    orgContext: OrganizationContext,
  ): Promise<Organization> {
    if (!orgContext.isSuperAdmin) {
      throw new ForbiddenException(
        'Only SUPER_ADMIN can deactivate organizations',
      );
    }
    const org = await this.findOne(id, orgContext);
    org.isActive = false;
    return this.repository.save(org);
  }

  /**
   * Provision an organization administrator (SOCIETY_ADMIN) for a new client
   * society in one atomic call:
   *   1. SUPER_ADMIN only — platform-scoped provisioning operation.
   *   2. Target organization must exist and be active (`:id` is the explicit
   *      target society; it never grants authorization on its own).
   *   3. Find or create the auth User for the phone number.
   *   4. Grant the SOCIETY_ADMIN membership in `user_roles` for the target
   *      organization (exactly one role per user per society — user_roles is
   *      the sole source of society membership).
   *
   * The route permission (admin_user:manage) is shared with SOCIETY_ADMIN, so
   * the SUPER_ADMIN check in this service is the authoritative gate.
   */
  async provisionAdmin(
    orgId: string,
    dto: ProvisionOrganizationAdminDto,
    orgContext: OrganizationContext,
  ) {
    if (!orgContext.isSuperAdmin) {
      throw new ForbiddenException(
        'Only SUPER_ADMIN can provision organization administrators',
      );
    }

    const org = await this.repository.findOneBy({ id: orgId });
    if (!org || !org.isActive) {
      throw new NotFoundException(`Organization with id ${orgId} not found`);
    }

    const mobileNumber = (dto.phone ?? '').trim();

    // 1. Find or create the auth user for this phone number.
    // Repos are resolved by registered entity name (string) — same pattern as
    // resident/staff role grants; avoids loading heavy relation graphs early.
    const userRepo = this.dataSource.getRepository('User');
    let user = await userRepo.findOneBy({ mobileNumber } as any);
    if (!user) {
      user = userRepo.create({
        id: randomUUID(),
        mobileNumber,
        isAuthenticated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Partial<User>);
      await userRepo.save(user);
    }

    // 2. Exactly one role per user per society (UNIQUE(user_id, organization_id)).
    const userRoleRepo = this.dataSource.getRepository('UserRole');
    const existing = await userRoleRepo.findOneBy({
      userId: user.id,
      organization_id: orgId,
    } as any);
    if (existing) {
      throw new ConflictException(
        'This user already has a role in this organization',
      );
    }

    // 3. Resolve the SOCIETY_ADMIN role from role_master.
    const roleRepo = this.dataSource.getRepository('Role');
    const role = await roleRepo.findOneBy({ name: 'SOCIETY_ADMIN' } as any);
    if (!role) {
      throw new InternalServerErrorException(
        'SOCIETY_ADMIN role is not configured in role_master',
      );
    }

    // 4. Grant the membership.
    await userRoleRepo.save(
      userRoleRepo.create({
        userId: user.id,
        roleId: (role as any).id,
        organization_id: orgId,
        assignedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any),
    );

    return {
      organization_id: orgId,
      organization_name: org.name,
      user_id: user.id,
      phone: user.mobileNumber,
      role: (role as any).name ?? 'SOCIETY_ADMIN',
      fullName: dto.fullName ?? null,
      email: dto.email ?? null,
    };
  }
}

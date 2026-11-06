import { FileMetadata } from '../database/entities/file-metadata.entity';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Resident } from '../database/entities/resident.entity';
import { Flat } from '../database/entities/flat.entity';
import { User } from '../database/entities/user.entity';
import { Vehicle } from '../database/entities/vehicle.entity';
import { OrganizationContextService } from '../organization/organization-context.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/audit.enums';
import {
  extractRequestMeta,
  recordAudit,
  resolveAuditContext,
  toSnapshot,
} from '../audit/audit-context';

@Injectable()
export class ResidentService {
  private readonly authorizationService?: AuthorizationService;
  private readonly auditService?: AuditService;

  constructor(
    private readonly dataSource: DataSource,
    private readonly organizationContextService: OrganizationContextService,
    @Optional() auditServiceOrAuth?: any,
    @Optional() maybeAuditService?: AuditService,
  ) {
    if (auditServiceOrAuth && typeof auditServiceOrAuth.record === 'function') {
      this.auditService = auditServiceOrAuth;
    } else {
      this.authorizationService = auditServiceOrAuth;
      this.auditService = maybeAuditService;
    }
  }

  private getResidentRepo(): Repository<Resident> {
    return (this.dataSource.getRepository('Resident') || this.dataSource.getRepository(Resident)) as unknown as Repository<Resident>;
  }

  private getFlatRepo(): Repository<Flat> {
    return (this.dataSource.getRepository('Flat') || this.dataSource.getRepository(Flat)) as unknown as Repository<Flat>;
  }

  private getUserRepo(): Repository<User> {
    return (this.dataSource.getRepository('User') || this.dataSource.getRepository(User)) as unknown as Repository<User>;
  }

  private async validateProfilePhoto(id: string | null | undefined, organizationId: string, residentId?: string): Promise<void> {
    if (!id) return;
    const file = await this.dataSource.getRepository(FileMetadata).findOneBy({ id, organization_id: organizationId, is_active: true });
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.mime_type) ||
        (file.purpose !== 'PROFILE_PHOTO' && file.category !== 'Profile Photo') ||
        (file.resident_id && file.resident_id !== residentId)) throw new ForbiddenException('Profile photo not found or access denied');
    const linked = await this.getResidentRepo().findOneBy({ organization_id: organizationId, profile_photo_file_id: id });
    if (linked && linked.id !== residentId) throw new ForbiddenException('Photo already belongs to another resident');
  }

  /**
   * Phase 11 Step 2: the guard-resolved organization context is passed in by
   * the controller. The fallback (empty request) is only used when the
   * service is invoked outside the guarded HTTP flow.
   */
  async createResident(
    createResidentDto: {
      user_id: string;
      organization_id: string;
      flat_id?: string;
      name?: string;
      resident_type?: 'OWNER' | 'TENANT' | 'FAMILY';
      email?: string;
      is_primary?: boolean;
      profile_photo_file_id?: string;
      date_of_birth?: string;
      emergency_contact_name?: string;
      emergency_contact_relationship?: string;
      emergency_contact_phone?: string;
      move_in_date?: string;
      relationship_to_primary?: string;
      owner_name?: string;
      owner_contact?: string;
      vehicle_details?: Array<{
        type?: string;
        make?: string;
        model?: string;
        registration?: string;
      }>;
    },
    passedOrgContext?: any,
  ) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const organizationId =
      orgContext.targetOrganizationId ??
      orgContext.organizationId ??
      orgContext.organization_id;
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    if (
      createResidentDto.organization_id &&
      createResidentDto.organization_id !== organizationId
    ) {
      throw new ForbiddenException(
        'You can only create residents in your organization',
      );
    }

    // Validate user exists
    const user = await this.getUserRepo().findOneBy({ id: createResidentDto.user_id });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate flat exists and belongs to organization
    if (createResidentDto.flat_id) {
      const flat = await this.getFlatRepo().findOneBy({
        id: createResidentDto.flat_id,
        organization_id: organizationId,
      });
      if (!flat) {
        throw new ForbiddenException('Flat not found or access denied');
      }
    }

    await this.validateProfilePhoto(createResidentDto.profile_photo_file_id, organizationId);
    const resident = this.getResidentRepo().create({
      id: randomUUID(),
      user_id: createResidentDto.user_id,
      organization_id: organizationId,
      flat_id: createResidentDto.flat_id,
      name: createResidentDto.name,
      resident_type: createResidentDto.resident_type ?? 'OWNER',
      email: createResidentDto.email,
      is_primary: createResidentDto.is_primary ?? false,
      kyc_status: (createResidentDto as any).kyc_status ?? 'VERIFIED',
      isActive: true,
      app_access_status: (createResidentDto as any).app_access_status !== undefined ? (createResidentDto as any).app_access_status : true,
      profile_photo_file_id: createResidentDto.profile_photo_file_id ?? null,
      date_of_birth: createResidentDto.date_of_birth ?? null,
      emergency_contact_name: createResidentDto.emergency_contact_name ?? null,
      emergency_contact_relationship:
        createResidentDto.emergency_contact_relationship ?? null,
      emergency_contact_phone: createResidentDto.emergency_contact_phone ?? null,
      move_in_date: createResidentDto.move_in_date ?? null,
      relationship_to_primary: createResidentDto.relationship_to_primary ?? null,
      owner_name: createResidentDto.owner_name ?? null,
      owner_contact: createResidentDto.owner_contact ?? null,
      vehicle_details: createResidentDto.vehicle_details ?? null,
    });

    const saved = await this.getResidentRepo().save(resident);
    if (this.auditService) {
      await recordAudit(this.auditService as any, {
        ...resolveAuditContext({
          orgContext,
          entityOrganizationId: (saved as any).organization_id,
        }),
        action: AuditAction.CREATE,
        entity_type: AuditEntityType.RESIDENT,
        entity_id: (saved as any).id ?? null,
        old_values: null,
        new_values: toSnapshot(saved),
        ...extractRequestMeta(undefined),
      } as never);
    }
    return saved;
  }

  /**
   * Onboard a brand-new resident in a single step:
   *   1. Find or create the auth User for the phone number.
   *   2. Create the resident record with profile details (delegates to the
   *      audited createResident path).
   *   3. Grant the RESIDENT role in the target organization (user_roles is the
   *      sole source of society membership).
   *
   * Multiple residents (owner + tenant + family) can share a flat by calling
   * this once per person with the same flat_id — residents.flat_id has no
   * unique constraint.
   */
  async onboardResident(
    dto: {
      name: string;
      phone: string;
      email?: string;
      flat_id?: string;
      resident_type?: 'OWNER' | 'TENANT' | 'FAMILY';
      is_primary?: boolean;
      profile_photo_file_id?: string;
      date_of_birth?: string;
      emergency_contact_name?: string;
      emergency_contact_relationship?: string;
      emergency_contact_phone?: string;
      move_in_date?: string;
      relationship_to_primary?: string;
      owner_name?: string;
      owner_contact?: string;
      vehicle_details?: Array<{
        type?: string;
        make?: string;
        model?: string;
        registration?: string;
      }>;
    },
    passedOrgContext?: any,
  ) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const organizationId =
      orgContext.targetOrganizationId ??
      orgContext.organizationId ??
      orgContext.organization_id;
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    const mobileNumber = (dto.phone ?? '').trim();

    // 1. Find or create the auth user for this phone number.
    const userRepo = this.getUserRepo();
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

    // 1b. A user can be a resident of a society only once.
    const existingResident = await this.getResidentRepo().findOneBy({
      user_id: user.id,
      organization_id: organizationId,
    } as any);
    if (existingResident) {
      throw new ConflictException(
        'This mobile number is already registered as a resident',
      );
    }

    // 2. Create the resident profile (audited in createResident).
    const resident = await this.createResident(
      {
        user_id: user.id,
        organization_id: organizationId,
        flat_id: dto.flat_id,
        name: dto.name,
        resident_type: dto.resident_type ?? 'OWNER',
        email: dto.email,
        is_primary: dto.is_primary ?? false,
        profile_photo_file_id: dto.profile_photo_file_id,
        date_of_birth: dto.date_of_birth,
        emergency_contact_name: dto.emergency_contact_name,
        emergency_contact_relationship: dto.emergency_contact_relationship,
        emergency_contact_phone: dto.emergency_contact_phone,
        move_in_date: dto.move_in_date,
        relationship_to_primary: dto.relationship_to_primary,
        owner_name: dto.owner_name,
        owner_contact: dto.owner_contact,
        vehicle_details: dto.vehicle_details,
        kyc_status: (dto as any).kyc_status ?? 'VERIFIED',
        app_access_status: (dto as any).app_access_status !== undefined ? (dto as any).app_access_status : true,
      } as any,
      orgContext,
    );

    // 3. Ensure the user holds the RESIDENT role in this organization.
    await this.ensureResidentRole(user.id, organizationId);

    // 4. Synchronize vehicle details into vehicles table if provided
    if (dto.vehicle_details && dto.vehicle_details.length > 0) {
      await this.syncResidentVehicles(
        resident.id,
        dto.flat_id ?? null,
        organizationId,
        dto.vehicle_details,
      );
    }

    return resident;
  }

  /**
   * Syncs onboarded/updated vehicle records into the vehicles table.
   * Checks for duplicate active registrations within the organization.
   */
  private async syncResidentVehicles(
    residentId: string,
    flatId: string | null,
    organizationId: string,
    vehicleDetails: Array<{
      type?: string;
      make?: string;
      model?: string;
      registration?: string;
      color?: string;
    }>,
  ): Promise<void> {
    const vehicleRepo = this.dataSource.getRepository(Vehicle);
    for (const v of vehicleDetails) {
      const reg = (v.registration ?? '').trim().toUpperCase();
      if (!reg) continue;

      const existing = await vehicleRepo.findOneBy({
        organization_id: organizationId,
        registration_number: reg,
        is_active: true,
      });

      if (existing) {
        // If it's already registered to another resident/vehicle record, conflict
        if (existing.resident_id && existing.resident_id !== residentId) {
          throw new ConflictException(
            `Vehicle with registration ${reg} is already registered to another resident in this society`,
          );
        }
        // Update existing vehicle
        existing.flat_id = flatId ?? existing.flat_id;
        let vType = v.type || existing.vehicle_type || '4W';
        if (vType === 'FOUR_WHEELER') vType = '4W';
        if (vType === 'TWO_WHEELER') vType = '2W';
        existing.vehicle_type = vType;
        const makeModel = [v.make, v.model].filter(Boolean).join(' ').trim();
        if (makeModel) existing.make_model = makeModel;
        if (v.color) existing.color = v.color;
        await vehicleRepo.save(existing);
      } else {
        let vType = v.type || '4W';
        if (vType === 'FOUR_WHEELER') vType = '4W';
        if (vType === 'TWO_WHEELER') vType = '2W';
        const makeModel = [v.make, v.model].filter(Boolean).join(' ').trim();
        const newVehicle = vehicleRepo.create({
          id: randomUUID(),
          organization_id: organizationId,
          resident_id: residentId,
          flat_id: flatId,
          registration_number: reg,
          vehicle_type: vType,
          make_model: makeModel || null,
          color: v.color || null,
          is_active: true,
        });
        await vehicleRepo.save(newVehicle);
      }
    }
  }

  /**
   * Grants RESIDENT to a user in an organization unless the user already has a
   * role there (exactly one role per user per society). Fails soft when the
   * role is not configured so resident creation is never blocked by RBAC seed
   * state.
   */
  private async ensureResidentRole(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    try {
      const userRoleRepo = this.dataSource.getRepository('UserRole');
      const roleRepo = this.dataSource.getRepository('Role');

      const existing = await userRoleRepo.findOneBy({
        userId,
        organization_id: organizationId,
      } as any);
      if (existing) return;

      const role = await roleRepo.findOneBy({ name: 'RESIDENT' } as any);
      if (!role) return;

      await userRoleRepo.save(
        userRoleRepo.create({
          userId,
          roleId: (role as any).id,
          organization_id: organizationId,
          assignedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any),
      );
    } catch {
      // Failing to seed the role must not abort resident onboarding; the
      // admin can grant app access/role out-of-band. Resident creation wins.
    }
  }

  async findMe(userId: string, passedOrgContext?: any) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const organizationId =
      orgContext.targetOrganizationId ??
      orgContext.organizationId ??
      orgContext.organization_id;
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    const repo = this.getResidentRepo();
    let resident: Resident | null = null;

    if (typeof repo.createQueryBuilder === 'function') {
      const qb = repo.createQueryBuilder('resident');
      if (typeof qb.leftJoinAndSelect === 'function') {
        qb.leftJoin('resident.user', 'user').addSelect(['user.id', 'user.mobileNumber'])
          .leftJoinAndSelect('resident.flat', 'flat')
          .leftJoinAndSelect('flat.building', 'building')
          .leftJoinAndSelect('flat.floor', 'floor');
      }
      resident = await qb
        .where('resident.user_id = :userId', { userId })
        .andWhere('resident.organization_id = :organizationId', {
          organizationId,
        })
        .getOne();
    } else if (typeof repo.findOneBy === 'function') {
      resident = await repo.findOneBy({
        user_id: userId,
        organization_id: organizationId,
      } as any);
    }

    if (!resident) {
      throw new NotFoundException('Resident record not found');
    }

    return resident;
  }

  async findAll(passedOrgContext?: any, userId?: string) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const organizationId =
      orgContext.targetOrganizationId ??
      orgContext.organizationId ??
      orgContext.organization_id;
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    if (userId && this.authorizationService) {
      const userRoleResult = await this.authorizationService.getUserRole(
        userId,
        organizationId,
      );
      const roleName = userRoleResult?.role?.name;
      if (roleName === 'RESIDENT') {
        throw new ForbiddenException(
          'Residents are not permitted to list all organization residents',
        );
      }
    }

    const repo = this.getResidentRepo();
    if (typeof repo.createQueryBuilder === 'function') {
      const qb = repo.createQueryBuilder('resident');
      if (typeof qb.leftJoinAndSelect === 'function') {
        qb.leftJoin('resident.user', 'user').addSelect(['user.id', 'user.mobileNumber'])
          .leftJoinAndSelect('resident.flat', 'flat')
          .leftJoinAndSelect('flat.building', 'building')
          .leftJoinAndSelect('flat.floor', 'floor');
      }
      return qb
        .where('resident.organization_id = :organizationId', {
          organizationId,
        })
        .andWhere('resident.isActive = :isActive', { isActive: true })
        .getMany();
    } else if (typeof repo.findBy === 'function') {
      return repo.findBy({ organization_id: organizationId, isActive: true } as any);
    }

    return [];
  }

  async findOne(id: string, passedOrgContext?: any, userId?: string) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const organizationId =
      orgContext.targetOrganizationId ??
      orgContext.organizationId ??
      orgContext.organization_id;
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    const repo = this.getResidentRepo();
    let resident: Resident | null = null;

    if (typeof repo.createQueryBuilder === 'function') {
      const qb = repo.createQueryBuilder('resident');
      if (typeof qb.leftJoinAndSelect === 'function') {
        qb.leftJoin('resident.user', 'user').addSelect(['user.id', 'user.mobileNumber'])
          .leftJoinAndSelect('resident.flat', 'flat')
          .leftJoinAndSelect('flat.building', 'building')
          .leftJoinAndSelect('flat.floor', 'floor');
      }
      resident = await qb
        .where('resident.id = :id', { id })
        .andWhere('resident.organization_id = :organizationId', {
          organizationId,
        })
        .getOne();
    } else if (typeof repo.findOneBy === 'function') {
      resident = await repo.findOneBy({
        id,
        organization_id: organizationId,
      } as any);
    }

    if (!resident) {
      throw new NotFoundException('Resident not found');
    }

    if (userId && this.authorizationService) {
      const userRoleResult = await this.authorizationService.getUserRole(
        userId,
        organizationId,
      );
      const roleName = userRoleResult?.role?.name;
      if (roleName === 'RESIDENT') {
        if (resident.user_id !== userId) {
          throw new ForbiddenException('Access denied to this resident record');
        }
      }
    }

    return resident;
  }

  async update(
    id: string,
    updateResidentDto: {
      name?: string;
      email?: string;
      flat_id?: string;
      resident_type?: 'OWNER' | 'TENANT' | 'FAMILY';
      is_primary?: boolean;
      kyc_status?: 'PENDING' | 'VERIFIED' | 'REJECTED';
      isActive?: boolean;
      phone?: string;
      date_of_birth?: string;
      emergency_contact_name?: string;
      emergency_contact_relationship?: string;
      emergency_contact_phone?: string;
      move_in_date?: string;
      relationship_to_primary?: string;
      owner_name?: string;
      owner_contact?: string;
      profile_photo_file_id?: string;
      vehicle_details?: Array<{
        type?: string;
        make?: string;
        model?: string;
        registration?: string;
        color?: string;
      }>;
    },
    passedOrgContext?: any,
  ) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const organizationId =
      orgContext.targetOrganizationId ??
      orgContext.organizationId ??
      orgContext.organization_id;
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    const resident = await this.getResidentRepo().findOneBy({
      id,
      organization_id: organizationId,
    });
    if (!resident) {
      throw new ForbiddenException('Resident not found or access denied');
    }

    const oldValues: Record<string, unknown> = {
      ...(toSnapshot(resident) as Record<string, unknown>),
    };

    let mobileChange: { from: string; to: string } | null = null;

    if (updateResidentDto.flat_id !== undefined) {
      if (updateResidentDto.flat_id) {
        const flat = await this.getFlatRepo().findOneBy({
          id: updateResidentDto.flat_id,
          organization_id: organizationId,
        });
        if (!flat) {
          throw new ForbiddenException('Flat not found or access denied');
        }
        resident.flat_id = updateResidentDto.flat_id;
      } else {
        resident.flat_id = null as any;
      }
    }

    if (updateResidentDto.name !== undefined) resident.name = updateResidentDto.name;
    if (updateResidentDto.email !== undefined) resident.email = updateResidentDto.email;
    if (updateResidentDto.resident_type !== undefined) resident.resident_type = updateResidentDto.resident_type;
    if (updateResidentDto.is_primary !== undefined) resident.is_primary = updateResidentDto.is_primary;
    if (updateResidentDto.kyc_status !== undefined) resident.kyc_status = updateResidentDto.kyc_status;
    if (updateResidentDto.isActive !== undefined) resident.isActive = updateResidentDto.isActive;
    if ((updateResidentDto as any).date_of_birth !== undefined) resident.date_of_birth = (updateResidentDto as any).date_of_birth || null;
    if ((updateResidentDto as any).emergency_contact_name !== undefined) resident.emergency_contact_name = (updateResidentDto as any).emergency_contact_name || null;
    if ((updateResidentDto as any).emergency_contact_relationship !== undefined) resident.emergency_contact_relationship = (updateResidentDto as any).emergency_contact_relationship || null;
    if ((updateResidentDto as any).emergency_contact_phone !== undefined) resident.emergency_contact_phone = (updateResidentDto as any).emergency_contact_phone || null;
    if ((updateResidentDto as any).move_in_date !== undefined) resident.move_in_date = (updateResidentDto as any).move_in_date || null;
    if ((updateResidentDto as any).relationship_to_primary !== undefined) resident.relationship_to_primary = (updateResidentDto as any).relationship_to_primary || null;
    if ((updateResidentDto as any).owner_name !== undefined) resident.owner_name = (updateResidentDto as any).owner_name || null;
    if ((updateResidentDto as any).owner_contact !== undefined) resident.owner_contact = (updateResidentDto as any).owner_contact || null;
    if (updateResidentDto.profile_photo_file_id !== undefined) await this.validateProfilePhoto(updateResidentDto.profile_photo_file_id, organizationId, resident.id);
    if ((updateResidentDto as any).profile_photo_file_id !== undefined) resident.profile_photo_file_id = (updateResidentDto as any).profile_photo_file_id || null;
    if ((updateResidentDto as any).vehicle_details !== undefined) resident.vehicle_details = (updateResidentDto as any).vehicle_details || null;

    // Mobile number is the resident's login identity and lives on the auth
    // User (users.mobileNumber is unique). Update it here so "Edit Resident
    // Profile" can correct a mistyped number. Surface a clear 409 on clash
    // instead of a raw DB unique-violation, and only when it actually changes.
    if (updateResidentDto.phone !== undefined) {
      const nextMobile = (updateResidentDto.phone ?? '').trim();
      const userRepo = this.getUserRepo();
      const user = await userRepo.findOneBy({
        id: resident.user_id,
      } as any);
      if (!user) {
        throw new ForbiddenException('Resident user account not found');
      }
      if (nextMobile && nextMobile !== user.mobileNumber) {
        const clash = await userRepo.findOneBy({
          mobileNumber: nextMobile,
        } as any);
        if (clash && clash.id !== user.id) {
          throw new ConflictException('This mobile number is already registered');
        }
        mobileChange = { from: user.mobileNumber, to: nextMobile };
        user.mobileNumber = nextMobile;
        user.updatedAt = new Date();
        await userRepo.save(user);
      }
    }

    const saved = await this.getResidentRepo().save(resident);

    if (updateResidentDto.vehicle_details && updateResidentDto.vehicle_details.length > 0) {
      await this.syncResidentVehicles(
        saved.id,
        saved.flat_id ?? null,
        organizationId,
        updateResidentDto.vehicle_details,
      );
    }
    const newValues: Record<string, unknown> = {
      ...(toSnapshot(saved) as Record<string, unknown>),
    };
    if (mobileChange) {
      oldValues.mobileNumber = mobileChange.from;
      newValues.mobileNumber = mobileChange.to;
    }
    if (this.auditService) {
      await recordAudit(this.auditService as any, {
        ...resolveAuditContext({
          orgContext,
          entityOrganizationId: (saved as any).organization_id,
        }),
        action: AuditAction.UPDATE,
        entity_type: AuditEntityType.RESIDENT,
        entity_id: (saved as any).id ?? null,
        old_values: oldValues,
        new_values: newValues,
        ...extractRequestMeta(undefined),
      } as never);
    }
    return saved;
  }

  async remove(id: string, passedOrgContext?: any, permanent?: boolean) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const organizationId =
      orgContext.targetOrganizationId ??
      orgContext.organizationId ??
      orgContext.organization_id;
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    const resident = await this.getResidentRepo().findOneBy({
      id,
      organization_id: organizationId,
    });
    if (!resident) {
      throw new ForbiddenException('Resident not found or access denied');
    }

    // Inspect historical financial dues and payments before permanent deletion
    const duesRepo = this.dataSource.getRepository('MaintenanceDue');
    if (duesRepo) {
      const dueCount = await duesRepo.countBy({ flat_id: resident.flat_id });
      if (dueCount > 0 && permanent) {
        throw new ForbiddenException(
          'Cannot permanently delete resident with existing financial dues records. Deactivate instead.',
        );
      }
    }

    const oldValues = toSnapshot(resident);

    if (permanent) {
      await this.getResidentRepo().delete({ id });
    } else {
      resident.isActive = false;
      await this.getResidentRepo().save(resident);
    }

    return { ...resident, isActive: false, permanent: !!permanent };
  }

  async bulkImport(
    dto: {
      records: Array<{
        name: string;
        phone: string;
        email?: string;
        flat_identifier?: string;
        building_name?: string;
        resident_type?: 'OWNER' | 'TENANT' | 'FAMILY';
        is_primary?: boolean;
      }>;
    },
    passedOrgContext?: any,
  ) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const organizationId =
      orgContext.targetOrganizationId ??
      orgContext.organizationId ??
      orgContext.organization_id;
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    const results = {
      total: dto.records.length,
      imported: 0,
      skipped: 0,
      errors: [] as Array<{ row: number; identifier: string; error: string }>,
    };

    for (let i = 0; i < dto.records.length; i++) {
      const row = dto.records[i];
      const rowNum = i + 1;
      const phone = (row.phone || '').trim();

      if (!row.name || !phone) {
        results.errors.push({
          row: rowNum,
          identifier: row.name || phone || 'Unknown',
          error: 'Name and phone number are required',
        });
        continue;
      }

      try {
        let flatId: string | undefined;
        if (row.flat_identifier) {
          const flatQb = this.getFlatRepo()
            .createQueryBuilder('flat')
            .innerJoin('flat.building', 'building')
            .where('flat.organization_id = :orgId', { orgId: organizationId })
            .andWhere('flat.flat_identifier = :flatIdentifier', {
              flatIdentifier: row.flat_identifier,
            });

          if (row.building_name) {
            flatQb.andWhere('LOWER(building.name) = LOWER(:bldgName)', {
              bldgName: row.building_name.trim(),
            });
          }

          const matchedFlat = await flatQb.getOne();
          if (matchedFlat) {
            flatId = matchedFlat.id;
          }
        }

        await this.onboardResident(
          {
            name: row.name.trim(),
            phone,
            email: row.email?.trim() || undefined,
            flat_id: flatId,
            resident_type: row.resident_type ?? 'OWNER',
            is_primary: row.is_primary ?? false,
          },
          orgContext,
        );
        results.imported++;
      } catch (err: any) {
        if (err instanceof ConflictException) {
          results.skipped++;
        } else {
          results.errors.push({
            row: rowNum,
            identifier: `${row.name} (${phone})`,
            error: err.message || 'Import failed',
          });
        }
      }
    }

    return results;
  }

  async assignFlat(
    residentId: string,
    flatId: string,
    passedOrgContext?: any,
  ) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const organizationId =
      orgContext.targetOrganizationId ??
      orgContext.organizationId ??
      orgContext.organization_id;
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    const resident = await this.getResidentRepo().findOneBy({
      id: residentId,
      organization_id: organizationId,
    });
    if (!resident) {
      throw new ForbiddenException('Resident not found or access denied');
    }

    const flat = await this.getFlatRepo().findOneBy({
      id: flatId,
      organization_id: organizationId,
    });
    if (!flat) {
      throw new ForbiddenException('Flat not found or access denied');
    }

    const oldValues = toSnapshot(resident);
    resident.flat_id = flatId;
    const saved = await this.getResidentRepo().save(resident);
    if (this.auditService) {
      await recordAudit(this.auditService as any, {
        ...resolveAuditContext({
          orgContext,
          entityOrganizationId: (saved as any).organization_id,
        }),
        action: AuditAction.ASSIGN,
        entity_type: AuditEntityType.RESIDENT,
        entity_id: (saved as any).id ?? null,
        old_values: oldValues,
        new_values: toSnapshot(saved),
        ...extractRequestMeta(undefined),
      } as never);
    }
    return saved;
  }

  async assignAppAccess(
    residentId: string,
    appAccessStatus: boolean,
    passedOrgContext?: any,
  ) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const organizationId =
      orgContext.targetOrganizationId ??
      orgContext.organizationId ??
      orgContext.organization_id;
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    const resident = await this.getResidentRepo().findOneBy({
      id: residentId,
      organization_id: organizationId,
    });
    if (!resident) {
      throw new ForbiddenException('Resident not found or access denied');
    }

    const oldValues = toSnapshot(resident);
    resident.app_access_status = appAccessStatus;
    const saved = await this.getResidentRepo().save(resident);
    if (this.auditService) {
      await recordAudit(this.auditService as any, {
        ...resolveAuditContext({
          orgContext,
          entityOrganizationId: (saved as any).organization_id,
        }),
        action: AuditAction.UPDATE,
        entity_type: AuditEntityType.RESIDENT,
        entity_id: (saved as any).id ?? null,
        old_values: oldValues,
        new_values: toSnapshot(saved),
        ...extractRequestMeta(undefined),
      } as never);
    }
    return saved;
  }
}

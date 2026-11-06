import {
  BadRequestException,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { randomUUID } from 'crypto';
import { StaffMember } from '../database/entities/staff-member.entity';
import { GuardShift } from '../database/entities/guard-shift.entity';
import { DutyRota } from '../database/entities/duty-rota.entity';
import { User } from '../database/entities/user.entity';
import { UserRole } from '../database/entities/user-role.entity';
import { Role } from '../database/entities/role.entity';
import {
  AssignStaffRoleDto,
  CreateStaffDto,
  UpdateStaffDto,
} from './dto/staff.dto';
import { CreateShiftDto, UpdateShiftDto } from './dto/shift.dto';
import { CreateRotaDto, UpdateRotaDto } from './dto/rota.dto';

/**
 * Role-master roles that may be granted to a staff member through
 * `PATCH /staff/:id/assign-role`.
 *
 * - `GUARD` / `RESIDENT` are the operational, organization-scoped roles a staff
 *   member can legitimately hold.
 * - `SOCIETY_ADMIN` is additionally permitted, but only for a SUPER_ADMIN
 *   caller (see `assignStaffRole`), so a society admin cannot mint further
 *   society admins.
 * - `SUPER_ADMIN` is never assignable here: per the approved architecture it is
 *   platform-scoped, never organization-scoped, and a supplied organization id
 *   never grants it.
 */
const ASSIGNABLE_STAFF_ROLES = ['GUARD', 'RESIDENT', 'SOCIETY_ADMIN'] as const;
type AssignableStaffRoleName = (typeof ASSIGNABLE_STAFF_ROLES)[number];

/** Roles a SOCIETY_ADMIN caller is allowed to grant via assign-role. */
const SOCIETY_ADMIN_ASSIGNABLE_ROLES: readonly AssignableStaffRoleName[] = [
  'GUARD',
  'RESIDENT',
];

export interface StaffAppRoleSummary {
  assigned_role_id: string | null;
  assigned_role_name: string | null;
}

export interface AssignableStaffRole {
  id: string;
  name: string;
  access_type: string;
}

@Injectable()
export class StaffService {
  constructor(private readonly dataSource: DataSource) {}

  private resolveOrgId(orgContext: any): string {
    const orgId =
      orgContext?.targetOrganizationId ??
      orgContext?.organizationId ??
      orgContext?.organization_id;
    if (!orgId) {
      throw new ForbiddenException('Organization context is required');
    }
    return orgId;
  }

  // --- STAFF MEMBERS ---

  async findAllStaff(orgContext: any): Promise<Array<StaffMember & StaffAppRoleSummary>> {
    const orgId = this.resolveOrgId(orgContext);
    const repo = this.dataSource.getRepository(StaffMember);
    let items = await repo.find({
      where: { organization_id: orgId },
      order: { created_at: 'ASC' },
    });

    if (items.length === 0) {
      const defaults = [
        {
          id: randomUUID(),
          organization_id: orgId,
          name: 'Ramesh Singh',
          role: 'Head Security Officer',
          phone: '+91 98201 11223',
          gate: 'Gate 1 (Main Entry)',
          shift: 'Morning (06:00 - 14:00)',
          status: 'On Duty',
        },
        {
          id: randomUUID(),
          organization_id: orgId,
          name: 'Manoj Kumar',
          role: 'Security Guard',
          phone: '+91 98202 22334',
          gate: 'Gate 2 (Pedestrian)',
          shift: 'Morning (06:00 - 14:00)',
          status: 'On Duty',
        },
        {
          id: randomUUID(),
          organization_id: orgId,
          name: 'Vikas Yadav',
          role: 'Security Guard',
          phone: '+91 98203 33445',
          gate: 'Gate 1 (ANPR Barrier)',
          shift: 'Evening (14:00 - 22:00)',
          status: 'Off Duty',
        },
        {
          id: randomUUID(),
          organization_id: orgId,
          name: 'Dinesh Patil',
          role: 'Estate Maintenance Supervisor',
          phone: '+91 98204 44556',
          gate: 'Clubhouse Desk',
          shift: 'General (09:00 - 18:00)',
          status: 'Active',
        },
        {
          id: randomUUID(),
          organization_id: orgId,
          name: 'Suresh Plumber',
          role: 'Plumbing AMC Specialist',
          phone: '+91 98205 55667',
          gate: 'On-Call Campus',
          shift: 'General (09:00 - 18:00)',
          status: 'Active',
        },
      ];

      await repo.save(defaults);
      items = await repo.find({
        where: { organization_id: orgId },
        order: { created_at: 'ASC' },
      });
    }

    return this.attachAppRoles(items, orgId);
  }

  /**
   * Decorate staff rows with the app login role actually granted in
   * `user_roles`. The roster has no direct FK to `user_roles`, so membership is
   * resolved by (user_id, organization_id) and the role name read from
   * `role_master`. Staff without a linked user, or whose user holds no role in
   * this organization, report `null` (i.e. no app access).
   */
  private async attachAppRoles(
    items: StaffMember[],
    organizationId: string,
  ): Promise<Array<StaffMember & StaffAppRoleSummary>> {
    const userIds = Array.from(
      new Set(
        items
          .map((s) => s.user_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    );

    const roleNamesById = new Map<string, string>();
    const roleByUserId = new Map<string, string>();

    if (userIds.length > 0) {
      const userRoleRepo = this.dataSource.getRepository(UserRole);
      const memberships = await userRoleRepo.find({
        where: { userId: In(userIds), organization_id: organizationId },
      });

      const roleIds = Array.from(
        new Set(memberships.map((m) => m.roleId).filter(Boolean)),
      );
      if (roleIds.length > 0) {
        const roles = await this.dataSource
          .getRepository(Role)
          .findBy({ id: In(roleIds) });
        for (const role of roles) roleNamesById.set(role.id, role.name);
      }

      for (const membership of memberships) {
        roleByUserId.set(membership.userId, membership.roleId);
      }
    }

    return items.map((staff) => {
      const roleId = staff.user_id ? roleByUserId.get(staff.user_id) : undefined;
      return {
        ...staff,
        assigned_role_id: roleId ?? null,
        assigned_role_name: roleId ? roleNamesById.get(roleId) ?? null : null,
      };
    });
  }

  /**
   * Locate the auth user matching a phone number in any canonical shape.
   * Lookup only — returns null when no identity exists yet.
   */
  private async findUserByPhone(phone: string): Promise<User | null> {
    if (!phone || phone.trim().length === 0) return null;

    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length === 0) return null;

    const candidateNumbers = Array.from(
      new Set(
        [
          phone.trim(),
          cleanDigits,
          cleanDigits.length === 10 ? `+91${cleanDigits}` : null,
          cleanDigits.length === 10 ? `91${cleanDigits}` : null,
          cleanDigits.startsWith('91') && cleanDigits.length === 12
            ? cleanDigits.slice(2)
            : null,
        ].filter(Boolean),
      ),
    ) as string[];

    const userRepo = this.dataSource.getRepository(User);
    for (const num of candidateNumbers) {
      const user = await userRepo.findOneBy({ mobileNumber: num });
      if (user) return user;
    }
    return null;
  }

  /**
   * Find the auth user matching a staff phone number, creating it when absent.
   *
   * Phone numbers arrive in several shapes ("+91 98200 00000", "9820000000",
   * "919820000000"), so every plausible canonical form is probed before a new
   * user is created — one human, one auth identity.
   */
  private async findOrCreateUserByPhone(phone: string): Promise<User | null> {
    const existing = await this.findUserByPhone(phone);
    if (existing) return existing;

    if (!phone || phone.trim().length === 0) return null;
    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length === 0) return null;

    const userRepo = this.dataSource.getRepository(User);
    const canonicalPhone = cleanDigits.length === 10 ? cleanDigits : phone.trim();
    const user = userRepo.create({
      id: randomUUID(),
      mobileNumber: canonicalPhone,
      isAuthenticated: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await userRepo.save(user);
    return user;
  }

  /**
   * Upsert the single (user_id, organization_id) membership in `user_roles`.
   *
   * `user_roles` carries a unique constraint on (user_id, organization_id), so
   * a user holds exactly one role per organization. Because `role_id` is part
   * of the composite primary key, changing a role requires removing the old row
   * rather than mutating it in place.
   */
  private async upsertUserRole(
    userId: string,
    roleId: string,
    organizationId: string,
  ): Promise<'granted' | 'unchanged'> {
    const userRoleRepo = this.dataSource.getRepository(UserRole);
    const existing = await userRoleRepo.findOneBy({
      userId,
      organization_id: organizationId,
    });

    if (existing) {
      if (existing.roleId === roleId) return 'unchanged';
      await userRoleRepo.remove(existing);
    }

    await userRoleRepo.save(
      userRoleRepo.create({
        userId,
        roleId,
        organization_id: organizationId,
        assignedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    return 'granted';
  }

  /**
   * Legacy guard-provisioning path used by `onboard-guard` and bulk import,
   * where the caller has explicitly asked to onboard a guard. Failures stay
   * non-fatal so an import row is not rejected over a role-grant hiccup; the
   * explicit `assignStaffRole` path below deliberately throws instead.
   */
  private async ensureGuardUserAndRole(phone: string, organizationId: string): Promise<User | null> {
    const user = await this.findOrCreateUserByPhone(phone);
    if (!user) return null;

    try {
      const guardRole = await this.dataSource
        .getRepository(Role)
        .findOneBy({ name: 'GUARD' });
      if (guardRole) {
        await this.upsertUserRole(user.id, guardRole.id, organizationId);
      }
    } catch {}

    return user;
  }

  /**
   * Role-master roles a caller is permitted to grant to a staff member.
   */
  async findAssignableRoles(orgContext: any): Promise<AssignableStaffRole[]> {
    const isSuperAdmin = orgContext?.isSuperAdmin === true;
    const allowed = isSuperAdmin
      ? [...ASSIGNABLE_STAFF_ROLES]
      : [...SOCIETY_ADMIN_ASSIGNABLE_ROLES];

    const roles = await this.dataSource
      .getRepository(Role)
      .findBy({ name: In(allowed), isActive: true });

    return roles
      .map((r) => ({
        id: r.id,
        name: r.name,
        access_type: r.accessType ?? 'Full Access',
      }))
      .sort((a, b) => allowed.indexOf(a.name as AssignableStaffRoleName) - allowed.indexOf(b.name as AssignableStaffRoleName));
  }

  /**
   * Grant an app login role to a staff member.
   *
   * This is the only path that grants `user_roles` membership for staff, and it
   * is explicitly permission-guarded (`staff:manage`) and organization-scoped.
   * The staff designation is untouched — job title and app role are separate
   * concerns by design.
   */
  async assignStaffRole(
    id: string,
    dto: AssignStaffRoleDto,
    orgContext: any,
  ): Promise<StaffMember & StaffAppRoleSummary> {
    const orgId = this.resolveOrgId(orgContext);
    const staffRepo = this.dataSource.getRepository(StaffMember);

    const staff = await staffRepo.findOne({ where: { id, organization_id: orgId } });
    if (!staff) {
      throw new NotFoundException('Staff member not found or access denied');
    }

    const role = await this.dataSource
      .getRepository(Role)
      .findOneBy({ id: dto.role_id });
    if (!role || role.isActive !== true) {
      throw new NotFoundException('Role not found or inactive');
    }

    if (!(ASSIGNABLE_STAFF_ROLES as readonly string[]).includes(role.name)) {
      throw new ForbiddenException(
        `Role '${role.name}' cannot be assigned to staff members`,
      );
    }

    const isSuperAdmin = orgContext?.isSuperAdmin === true;
    if (role.name === 'SOCIETY_ADMIN' && !isSuperAdmin) {
      throw new ForbiddenException(
        'Only a SUPER_ADMIN can grant SOCIETY_ADMIN access',
      );
    }

    const user = await this.findOrCreateUserByPhone(staff.phone);
    if (!user) {
      throw new BadRequestException(
        'Staff member has no valid phone number, so an app login cannot be created',
      );
    }

    await this.upsertUserRole(user.id, role.id, orgId);

    staff.user_id = user.id;
    staff.updated_at = new Date();
    const saved = await staffRepo.save(staff);

    return {
      ...saved,
      assigned_role_id: role.id,
      assigned_role_name: role.name,
    };
  }

  async createStaff(dto: CreateStaffDto, orgContext: any): Promise<StaffMember> {
    const orgId = this.resolveOrgId(orgContext);
    const repo = this.dataSource.getRepository(StaffMember);

    // Designation is a job title only. App access is granted exclusively via
    // PATCH /staff/:id/assign-role, never inferred from free text, so a
    // "Security Guard" designation can no longer silently produce (or fail to
    // produce) a GUARD login.
    const staff = repo.create({
      id: randomUUID(),
      organization_id: orgId,
      name: dto.name,
      role: dto.role,
      phone: dto.phone,
      gate: dto.gate || 'Main Gate',
      shift: dto.shift || 'General (09:00 - 18:00)',
      status: dto.status || 'Active',
      user_id: dto.user_id || null,
      profile_photo_url: dto.profile_photo_url || null,
      aadhaar_photo_url: dto.aadhaar_photo_url || null,
      aadhaar_number: dto.aadhaar_number || null,
      gender: dto.gender || null,
      emergency_contact: dto.emergency_contact || null,
      address: dto.address || null,
      date_of_joining: dto.date_of_joining || null,
    });

    return repo.save(staff);
  }

  async updateStaff(id: string, dto: UpdateStaffDto, orgContext: any): Promise<StaffMember> {
    const orgId = this.resolveOrgId(orgContext);
    const repo = this.dataSource.getRepository(StaffMember);

    const staff = await repo.findOne({ where: { id, organization_id: orgId } });
    if (!staff) {
      throw new NotFoundException('Staff member not found or access denied');
    }

    if (dto.name !== undefined) staff.name = dto.name;
    if (dto.role !== undefined) staff.role = dto.role;
    if (dto.gate !== undefined) staff.gate = dto.gate;
    if (dto.shift !== undefined) staff.shift = dto.shift;
    if (dto.status !== undefined) staff.status = dto.status;
    if (dto.profile_photo_url !== undefined) staff.profile_photo_url = dto.profile_photo_url;
    if (dto.aadhaar_photo_url !== undefined) staff.aadhaar_photo_url = dto.aadhaar_photo_url;
    if (dto.aadhaar_number !== undefined) staff.aadhaar_number = dto.aadhaar_number;
    if (dto.gender !== undefined) staff.gender = dto.gender;
    if (dto.emergency_contact !== undefined) staff.emergency_contact = dto.emergency_contact;
    if (dto.address !== undefined) staff.address = dto.address;
    if (dto.date_of_joining !== undefined) staff.date_of_joining = dto.date_of_joining;

    // Editing the designation never changes app access. The linked identity is
    // reconciled on every save so the roster stays honest: after a number
    // changes, the previous number's identity (e.g. an admin who once shared
    // this number) must not keep reporting SOCIETY_ADMIN. This only resolves an
    // existing auth user — no user is created and no role is ever granted here.
    if (dto.phone !== undefined) staff.phone = dto.phone;

    if (dto.user_id !== undefined) {
      staff.user_id = dto.user_id;
    } else {
      const linked = await this.findUserByPhone(staff.phone);
      const resolvedId = linked ? linked.id : null;
      if (resolvedId !== staff.user_id) staff.user_id = resolvedId;
    }

    staff.updated_at = new Date();
    return repo.save(staff);
  }

  async onboardGuard(
    dto: {
      name: string;
      phone: string;
      gate?: string;
      shift?: string;
      role?: string;
    },
    orgContext: any,
  ): Promise<StaffMember> {
    const orgId = this.resolveOrgId(orgContext);
    const guardUser = await this.ensureGuardUserAndRole(dto.phone, orgId);

    const staffRepo = this.dataSource.getRepository(StaffMember);
    let staff = await staffRepo.findOneBy({
      organization_id: orgId,
      phone: dto.phone,
    });

    if (!staff) {
      staff = staffRepo.create({
        id: randomUUID(),
        organization_id: orgId,
        name: dto.name,
        role: dto.role || 'Security Guard',
        phone: dto.phone,
        gate: dto.gate || 'Gate 1 (Main Entry)',
        shift: dto.shift || 'Morning (06:00 - 14:00)',
        status: 'Active',
        user_id: guardUser ? guardUser.id : null,
      });
    } else {
      staff.name = dto.name;
      if (guardUser) staff.user_id = guardUser.id;
      if (dto.gate) staff.gate = dto.gate;
      if (dto.shift) staff.shift = dto.shift;
    }

    return staffRepo.save(staff);
  }

  async bulkImportStaff(
    dto: {
      records: Array<{
        name: string;
        phone: string;
        role?: string;
        gate?: string;
        shift?: string;
      }>;
    },
    orgContext: any,
  ) {
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
          error: 'Name and phone are required',
        });
        continue;
      }

      try {
        await this.onboardGuard(
          {
            name: row.name.trim(),
            phone,
            role: row.role || 'Security Guard',
            gate: row.gate,
            shift: row.shift,
          },
          orgContext,
        );
        results.imported++;
      } catch (err: any) {
        results.errors.push({
          row: rowNum,
          identifier: `${row.name} (${phone})`,
          error: err.message || 'Import failed',
        });
      }
    }

    return results;
  }

  async deleteStaff(id: string, orgContext: any): Promise<{ deleted: boolean }> {
    const orgId = this.resolveOrgId(orgContext);
    const repo = this.dataSource.getRepository(StaffMember);

    const staff = await repo.findOne({ where: { id, organization_id: orgId } });
    if (!staff) {
      throw new NotFoundException('Staff member not found or access denied');
    }

    await repo.remove(staff);
    return { deleted: true };
  }

  // --- SHIFTS ---

  async findAllShifts(orgContext: any): Promise<GuardShift[]> {
    const orgId = this.resolveOrgId(orgContext);
    const repo = this.dataSource.getRepository(GuardShift);
    let items = await repo.find({
      where: { organization_id: orgId },
      order: { created_at: 'ASC' },
    });

    if (items.length === 0) {
      const defaults = [
        {
          id: randomUUID(),
          organization_id: orgId,
          name: 'Morning Shift (Alpha)',
          start_time: '06:00 AM',
          end_time: '02:00 PM',
          required_guards: 4,
          assigned_guards: 4,
          assigned_gates: 'Gate 1, Gate 2',
          status: 'Active',
        },
        {
          id: randomUUID(),
          organization_id: orgId,
          name: 'Evening Shift (Bravo)',
          start_time: '02:00 PM',
          end_time: '10:00 PM',
          required_guards: 4,
          assigned_guards: 4,
          assigned_gates: 'Gate 1, Gate 2',
          status: 'Active',
        },
        {
          id: randomUUID(),
          organization_id: orgId,
          name: 'Night Shift (Charlie)',
          start_time: '10:00 PM',
          end_time: '06:00 AM',
          required_guards: 3,
          assigned_guards: 3,
          assigned_gates: 'Gate 1 Only (Gate 2 Locked)',
          status: 'Active',
        },
        {
          id: randomUUID(),
          organization_id: orgId,
          name: 'General Maintenance (Delta)',
          start_time: '09:00 AM',
          end_time: '06:00 PM',
          required_guards: 2,
          assigned_guards: 2,
          assigned_gates: 'Facility Office',
          status: 'Active',
        },
      ];

      await repo.save(defaults);
      items = await repo.find({
        where: { organization_id: orgId },
        order: { created_at: 'ASC' },
      });
    }

    return items;
  }

  async createShift(dto: CreateShiftDto, orgContext: any): Promise<GuardShift> {
    const orgId = this.resolveOrgId(orgContext);
    const repo = this.dataSource.getRepository(GuardShift);

    const shift = repo.create({
      id: randomUUID(),
      organization_id: orgId,
      name: dto.name,
      start_time: dto.start_time,
      end_time: dto.end_time,
      required_guards: dto.required_guards ?? 2,
      assigned_guards: dto.assigned_guards ?? 0,
      assigned_gates: dto.assigned_gates || 'Gate 1',
      status: dto.status || 'Active',
    });

    return repo.save(shift);
  }

  async updateShift(id: string, dto: UpdateShiftDto, orgContext: any): Promise<GuardShift> {
    const orgId = this.resolveOrgId(orgContext);
    const repo = this.dataSource.getRepository(GuardShift);

    const shift = await repo.findOne({ where: { id, organization_id: orgId } });
    if (!shift) {
      throw new NotFoundException('Shift not found or access denied');
    }

    if (dto.name !== undefined) shift.name = dto.name;
    if (dto.start_time !== undefined) shift.start_time = dto.start_time;
    if (dto.end_time !== undefined) shift.end_time = dto.end_time;
    if (dto.required_guards !== undefined) shift.required_guards = dto.required_guards;
    if (dto.assigned_guards !== undefined) shift.assigned_guards = dto.assigned_guards;
    if (dto.assigned_gates !== undefined) shift.assigned_gates = dto.assigned_gates;
    if (dto.status !== undefined) shift.status = dto.status;
    shift.updated_at = new Date();

    return repo.save(shift);
  }

  async deleteShift(id: string, orgContext: any): Promise<{ deleted: boolean }> {
    const orgId = this.resolveOrgId(orgContext);
    const repo = this.dataSource.getRepository(GuardShift);

    const shift = await repo.findOne({ where: { id, organization_id: orgId } });
    if (!shift) {
      throw new NotFoundException('Shift not found or access denied');
    }

    await repo.remove(shift);
    return { deleted: true };
  }

  // --- ROTA ---

  async findAllRota(orgContext: any): Promise<DutyRota[]> {
    const orgId = this.resolveOrgId(orgContext);
    const repo = this.dataSource.getRepository(DutyRota);
    let items = await repo.find({
      where: { organization_id: orgId },
      order: { created_at: 'ASC' },
    });

    if (items.length === 0) {
      const defaults = [
        {
          id: randomUUID(),
          organization_id: orgId,
          date: 'Today',
          guard_name: 'Ramesh Singh',
          shift_name: 'Morning Shift (Alpha)',
          gate: 'Gate 1 (Main ANPR)',
          status: 'On Duty',
        },
        {
          id: randomUUID(),
          organization_id: orgId,
          date: 'Today',
          guard_name: 'Manoj Kumar',
          shift_name: 'Morning Shift (Alpha)',
          gate: 'Gate 2 (Pedestrian)',
          status: 'On Duty',
        },
        {
          id: randomUUID(),
          organization_id: orgId,
          date: 'Today',
          guard_name: 'Vikas Yadav',
          shift_name: 'Evening Shift (Bravo)',
          gate: 'Gate 1 (Main ANPR)',
          status: 'Scheduled',
        },
        {
          id: randomUUID(),
          organization_id: orgId,
          date: 'Tomorrow',
          guard_name: 'Ramesh Singh',
          shift_name: 'Morning Shift (Alpha)',
          gate: 'Gate 1 (Main ANPR)',
          status: 'Scheduled',
        },
        {
          id: randomUUID(),
          organization_id: orgId,
          date: 'Tomorrow',
          guard_name: 'Manoj Kumar',
          shift_name: 'Evening Shift (Bravo)',
          gate: 'Gate 2 (Pedestrian)',
          status: 'Scheduled',
        },
      ];

      await repo.save(defaults);
      items = await repo.find({
        where: { organization_id: orgId },
        order: { created_at: 'ASC' },
      });
    }

    return items;
  }

  async createRota(dto: CreateRotaDto, orgContext: any): Promise<DutyRota> {
    const orgId = this.resolveOrgId(orgContext);
    const repo = this.dataSource.getRepository(DutyRota);

    const rota = repo.create({
      id: randomUUID(),
      organization_id: orgId,
      guard_name: dto.guard_name,
      shift_name: dto.shift_name,
      gate: dto.gate || 'Gate 1 (Main ANPR)',
      date: dto.date || 'Today',
      status: dto.status || 'Scheduled',
    });

    return repo.save(rota);
  }

  async updateRota(id: string, dto: UpdateRotaDto, orgContext: any): Promise<DutyRota> {
    const orgId = this.resolveOrgId(orgContext);
    const repo = this.dataSource.getRepository(DutyRota);

    const rota = await repo.findOne({ where: { id, organization_id: orgId } });
    if (!rota) {
      throw new NotFoundException('Duty rota entry not found or access denied');
    }

    if (dto.guard_name !== undefined) rota.guard_name = dto.guard_name;
    if (dto.shift_name !== undefined) rota.shift_name = dto.shift_name;
    if (dto.gate !== undefined) rota.gate = dto.gate;
    if (dto.date !== undefined) rota.date = dto.date;
    if (dto.status !== undefined) rota.status = dto.status;
    rota.updated_at = new Date();

    return repo.save(rota);
  }

  async deleteRota(id: string, orgContext: any): Promise<{ deleted: boolean }> {
    const orgId = this.resolveOrgId(orgContext);
    const repo = this.dataSource.getRepository(DutyRota);

    const rota = await repo.findOne({ where: { id, organization_id: orgId } });
    if (!rota) {
      throw new NotFoundException('Duty rota entry not found or access denied');
    }

    await repo.remove(rota);
    return { deleted: true };
  }
}

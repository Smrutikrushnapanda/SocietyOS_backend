import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { RequireOrganizationId } from '../authorization/require-permission.decorator';
import { StaffService } from './staff.service';
import {
  AssignStaffRoleDto,
  CreateStaffDto,
  UpdateStaffDto,
} from './dto/staff.dto';
import { CreateShiftDto, UpdateShiftDto } from './dto/shift.dto';
import { CreateRotaDto, UpdateRotaDto } from './dto/rota.dto';
import { StaffMember } from '../database/entities/staff-member.entity';
import { GuardShift } from '../database/entities/guard-shift.entity';
import { DutyRota } from '../database/entities/duty-rota.entity';
import {
  AssignableStaffRole,
  StaffAppRoleSummary,
} from './staff.service';

@Controller('staff')
@UseGuards(AuthGuard, OrganizationGuard, PermissionGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  // --- SHIFTS (Before :id route) ---

  @Get('shifts')
  @RequirePermission('staff:read')
  @RequireOrganizationId()
  async getShifts(@Request() req: any): Promise<GuardShift[]> {
    return this.staffService.findAllShifts(req.orgContext);
  }

  @Post('shifts')
  @RequirePermission('staff:manage')
  @RequireOrganizationId()
  async createShift(
    @Request() req: any,
    @Body() dto: CreateShiftDto,
  ): Promise<GuardShift> {
    return this.staffService.createShift(dto, req.orgContext);
  }

  @Put('shifts/:id')
  @RequirePermission('staff:manage')
  @RequireOrganizationId()
  async updateShift(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateShiftDto,
  ): Promise<GuardShift> {
    return this.staffService.updateShift(id, dto, req.orgContext);
  }

  @Delete('shifts/:id')
  @RequirePermission('staff:manage')
  @RequireOrganizationId()
  async deleteShift(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<{ deleted: boolean }> {
    return this.staffService.deleteShift(id, req.orgContext);
  }

  // --- ROTA (Before :id route) ---

  @Get('rota')
  @RequirePermission('staff:read')
  @RequireOrganizationId()
  async getRota(@Request() req: any): Promise<DutyRota[]> {
    return this.staffService.findAllRota(req.orgContext);
  }

  @Post('rota')
  @RequirePermission('staff:manage')
  @RequireOrganizationId()
  async createRota(
    @Request() req: any,
    @Body() dto: CreateRotaDto,
  ): Promise<DutyRota> {
    return this.staffService.createRota(dto, req.orgContext);
  }

  @Put('rota/:id')
  @RequirePermission('staff:manage')
  @RequireOrganizationId()
  async updateRota(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRotaDto,
  ): Promise<DutyRota> {
    return this.staffService.updateRota(id, dto, req.orgContext);
  }

  @Delete('rota/:id')
  @RequirePermission('staff:manage')
  @RequireOrganizationId()
  async deleteRota(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<{ deleted: boolean }> {
    return this.staffService.deleteRota(id, req.orgContext);
  }

  // --- STAFF ROSTER ---

  /**
   * Role-master roles a caller may grant to a staff member.
   *
   * Scoped to `staff:read` so the assignment control can render; the mutation
   * itself stays behind `staff:manage` on PATCH /staff/:id/assign-role.
   */
  @Get('assignable-roles')
  @RequirePermission('staff:read')
  @RequireOrganizationId()
  async getAssignableRoles(@Request() req: any): Promise<AssignableStaffRole[]> {
    return this.staffService.findAssignableRoles(req.orgContext);
  }

  /**
   * Grant an app login role (e.g. GUARD) to a staff member.
   *
   * This is what makes a guard able to sign in: `user_roles` is the sole source
   * of society membership, so without this row the authenticated user has no
   * authoritative role and the Guard portal rejects them.
   */
  @Patch(':id/assign-role')
  @RequirePermission('staff:manage')
  @RequireOrganizationId()
  async assignStaffRole(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: AssignStaffRoleDto,
  ): Promise<StaffMember & StaffAppRoleSummary> {
    return this.staffService.assignStaffRole(id, dto, req.orgContext);
  }

  @Post('onboard-guard')
  @RequirePermission('staff:manage')
  @RequireOrganizationId()
  async onboardGuard(
    @Request() req: any,
    @Body() dto: { name: string; phone: string; gate?: string; shift?: string; role?: string },
  ): Promise<StaffMember> {
    return this.staffService.onboardGuard(dto, req.orgContext);
  }

  @Post('bulk-import')
  @RequirePermission('staff:manage')
  @RequireOrganizationId()
  async bulkImport(
    @Request() req: any,
    @Body() dto: { records: any[] },
  ) {
    return this.staffService.bulkImportStaff(dto, req.orgContext);
  }

  @Get()
  @RequirePermission('staff:read')
  @RequireOrganizationId()
  async getStaff(
    @Request() req: any,
  ): Promise<Array<StaffMember & StaffAppRoleSummary>> {
    return this.staffService.findAllStaff(req.orgContext);
  }

  @Post()
  @RequirePermission('staff:manage')
  @RequireOrganizationId()
  async createStaff(
    @Request() req: any,
    @Body() dto: CreateStaffDto,
  ): Promise<StaffMember> {
    return this.staffService.createStaff(dto, req.orgContext);
  }

  @Put(':id')
  @RequirePermission('staff:manage')
  @RequireOrganizationId()
  async updateStaff(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ): Promise<StaffMember> {
    return this.staffService.updateStaff(id, dto, req.orgContext);
  }

  @Delete(':id')
  @RequirePermission('staff:manage')
  @RequireOrganizationId()
  async deleteStaff(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<{ deleted: boolean }> {
    return this.staffService.deleteStaff(id, req.orgContext);
  }
}

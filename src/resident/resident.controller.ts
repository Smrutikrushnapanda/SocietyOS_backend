import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { ResidentService } from './resident.service';
import { Resident } from '../database/entities/resident.entity';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import {
  RequirePermission,
  RequireOrganizationId,
} from '../authorization/require-permission.decorator';

import {
  CreateResidentDto,
  UpdateResidentDto,
  AssignFlatDto,
  OnboardResidentDto,
} from './dto/resident.dto';

/**
 * Phase 11 Step 2: resident endpoints are authenticated, permission-checked
 * (resident:read / resident:manage) and organization-scoped via req.orgContext.
 */
@Controller('residents')
@ApiTags('residents')
@UseGuards(AuthGuard, OrganizationGuard, PermissionGuard)
export class ResidentController {
  constructor(private readonly residentService: ResidentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, type: Resident })
  @RequirePermission('resident:manage')
  @RequireOrganizationId()
  async createResident(
    @Request() req: any,
    @Body()
    createResidentDto: CreateResidentDto,
  ) {
    return this.residentService.createResident(
      {
        ...createResidentDto,
        organization_id: req.orgContext.organizationId,
      },
      req.orgContext,
    );
  }

  /**
   * Onboard a new resident (name + phone + flat) in one call. Multiple
   * residents may be onboarded onto the same flat.
   */
  @Post('onboard')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, type: Resident })
  @RequirePermission('resident:manage')
  @RequireOrganizationId()
  async onboardResident(
    @Request() req: any,
    @Body() onboardResidentDto: OnboardResidentDto,
  ) {
    return this.residentService.onboardResident(
      onboardResidentDto,
      req.orgContext,
    );
  }

  @Get('me')
  @ApiResponse({ status: HttpStatus.OK, type: Resident })
  @RequirePermission('resident:read')
  @RequireOrganizationId()
  async findMe(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.residentService.findMe(userId, req.orgContext);
  }

  @Get()
  @ApiResponse({ status: HttpStatus.OK, type: [Resident] })
  @RequirePermission('resident:read')
  @RequireOrganizationId()
  async findAll(@Request() req: any) {
    return this.residentService.findAll(req.orgContext, req.user?.id);
  }

  @Post('bulk-import')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('resident:manage')
  @RequireOrganizationId()
  async bulkImport(
    @Request() req: any,
    @Body() dto: { records: any[] },
  ) {
    return this.residentService.bulkImport(dto, req.orgContext);
  }

  @Get(':id')
  @ApiResponse({ status: HttpStatus.OK, type: Resident })
  @RequirePermission('resident:read')
  @RequireOrganizationId()
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.residentService.findOne(id, req.orgContext, req.user?.id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Resident })
  @RequirePermission('resident:manage')
  @RequireOrganizationId()
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    updateResidentDto: UpdateResidentDto,
  ) {
    return this.residentService.update(id, updateResidentDto, req.orgContext);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Resident })
  @RequirePermission('resident:manage')
  @RequireOrganizationId()
  async remove(@Request() req: any, @Param('id') id: string) {
    const permanent = req.query?.permanent === 'true';
    return this.residentService.remove(id, req.orgContext, permanent);
  }

  @Patch(':residentId/assign-flat')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Resident })
  @RequirePermission('resident:manage')
  @RequireOrganizationId()
  async assignFlat(
    @Request() req: any,
    @Param('residentId') residentId: string,
    @Body()
    body: AssignFlatDto,
  ) {
    return this.residentService.assignFlat(
      residentId,
      body.flat_id,
      req.orgContext,
    );
  }
}

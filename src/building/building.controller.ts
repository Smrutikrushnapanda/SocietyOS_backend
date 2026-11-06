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
} from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { BuildingService } from './building.service';
import { Building } from '../database/entities/building.entity';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import {
  RequirePermission,
  RequireOrganizationId,
} from '../authorization/require-permission.decorator';

import { CreateBuildingDto, UpdateBuildingDto } from './dto/building.dto';

/**
 * Phase 11 Step 2: building endpoints are authenticated, permission-checked
 * (building:read / building:manage) and organization-scoped. The organization
 * is ALWAYS the guard-resolved context (req.orgContext) — a client-supplied
 * organization_id in the body never grants or changes authorization.
 */
@Controller('buildings')
@ApiTags('buildings')
@UseGuards(AuthGuard, OrganizationGuard, PermissionGuard)
export class BuildingController {
  constructor(private readonly buildingService: BuildingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, type: Building })
  @RequirePermission('building:manage')
  @RequireOrganizationId()
  async create(
    @Request() req: any,
    @Body()
    createBuildingDto: CreateBuildingDto,
  ) {
    return this.buildingService.create(
      {
        ...createBuildingDto,
        organization_id: req.orgContext.organizationId,
      },
      req.orgContext,
    );
  }

  @Get()
  @ApiResponse({ status: HttpStatus.OK, type: [Building] })
  @RequirePermission('building:read')
  @RequireOrganizationId()
  async findAll(@Request() req: any) {
    const includeInactive = req.query?.includeInactive === 'true';
    return this.buildingService.findAll(req.orgContext, includeInactive);
  }

  @Get(':id')
  @ApiResponse({ status: HttpStatus.OK, type: Building })
  @RequirePermission('building:read')
  @RequireOrganizationId()
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.buildingService.findOne(id, req.orgContext);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Building })
  @RequirePermission('building:manage')
  @RequireOrganizationId()
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    updateBuildingDto: UpdateBuildingDto,
  ) {
    return this.buildingService.update(id, updateBuildingDto, req.orgContext);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Building })
  @RequirePermission('building:manage')
  @RequireOrganizationId()
  async remove(@Request() req: any, @Param('id') id: string) {
    const permanent = req.query?.permanent === 'true';
    return this.buildingService.remove(id, req.orgContext, permanent);
  }
}

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
import { FloorService } from './floor.service';
import { Floor } from '../database/entities/floor.entity';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import {
  RequirePermission,
  RequireOrganizationId,
} from '../authorization/require-permission.decorator';

import { CreateFloorDto, UpdateFloorDto } from './dto/floor.dto';

/**
 * Phase 11 Step 2: floor endpoints are authenticated, permission-checked
 * (floor:read / floor:manage) and organization-scoped via req.orgContext.
 */
@Controller('floors')
@ApiTags('floors')
@UseGuards(AuthGuard, OrganizationGuard, PermissionGuard)
export class FloorController {
  constructor(private readonly floorService: FloorService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, type: Floor })
  @RequirePermission('floor:manage')
  @RequireOrganizationId()
  async create(
    @Request() req: any,
    @Body()
    createFloorDto: CreateFloorDto,
  ) {
    return this.floorService.create(
      {
        ...createFloorDto,
        organization_id: req.orgContext.organizationId,
      },
      req.orgContext,
    );
  }

  @Get()
  @ApiResponse({ status: HttpStatus.OK, type: [Floor] })
  @RequirePermission('floor:read')
  @RequireOrganizationId()
  async findAll(@Request() req: any) {
    return this.floorService.findAll(req.orgContext);
  }

  @Get(':id')
  @ApiResponse({ status: HttpStatus.OK, type: Floor })
  @RequirePermission('floor:read')
  @RequireOrganizationId()
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.floorService.findOne(id, req.orgContext);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Floor })
  @RequirePermission('floor:manage')
  @RequireOrganizationId()
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    updateFloorDto: UpdateFloorDto,
  ) {
    return this.floorService.update(id, updateFloorDto, req.orgContext);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Floor })
  @RequirePermission('floor:manage')
  @RequireOrganizationId()
  async remove(@Request() req: any, @Param('id') id: string) {
    const permanent = req.query?.permanent === 'true';
    return this.floorService.remove(id, req.orgContext, permanent);
  }

  @Get('building/:buildingId')
  @ApiResponse({ status: HttpStatus.OK, type: [Floor] })
  @RequirePermission('floor:read')
  @RequireOrganizationId()
  async findByBuilding(
    @Request() req: any,
    @Param('buildingId') buildingId: string,
  ) {
    return this.floorService.findAllByBuilding(buildingId, req.orgContext);
  }
}

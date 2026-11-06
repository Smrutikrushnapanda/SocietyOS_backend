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
import { FlatService } from './flat.service';
import { Flat } from '../database/entities/flat.entity';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import {
  RequirePermission,
  RequireOrganizationId,
} from '../authorization/require-permission.decorator';

import { CreateFlatDto, UpdateFlatDto } from './dto/flat.dto';

/**
 * Phase 11 Step 2: flat endpoints are authenticated, permission-checked
 * (flat:read / flat:manage) and organization-scoped via req.orgContext.
 */
@Controller('flats')
@ApiTags('flats')
@UseGuards(AuthGuard, OrganizationGuard, PermissionGuard)
export class FlatController {
  constructor(private readonly flatService: FlatService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, type: Flat })
  @RequirePermission('flat:manage')
  @RequireOrganizationId()
  async create(
    @Request() req: any,
    @Body()
    createFlatDto: CreateFlatDto,
  ) {
    return this.flatService.create(
      {
        ...createFlatDto,
        organization_id: req.orgContext.organizationId,
      },
      req.orgContext,
    );
  }

  @Get()
  @ApiResponse({ status: HttpStatus.OK, type: [Flat] })
  @RequirePermission('flat:read')
  @RequireOrganizationId()
  async findAll(@Request() req: any) {
    return this.flatService.findAll(req.orgContext);
  }

  @Get(':id')
  @ApiResponse({ status: HttpStatus.OK, type: Flat })
  @RequirePermission('flat:read')
  @RequireOrganizationId()
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.flatService.findOne(id, req.orgContext);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Flat })
  @RequirePermission('flat:manage')
  @RequireOrganizationId()
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    updateFlatDto: UpdateFlatDto,
  ) {
    return this.flatService.update(id, updateFlatDto, req.orgContext);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Flat })
  @RequirePermission('flat:manage')
  @RequireOrganizationId()
  async remove(@Request() req: any, @Param('id') id: string) {
    const permanent = req.query?.permanent === 'true';
    return this.flatService.remove(id, req.orgContext, permanent);
  }

  @Get('building/:buildingId')
  @ApiResponse({ status: HttpStatus.OK, type: [Flat] })
  @RequirePermission('flat:read')
  @RequireOrganizationId()
  async findByBuilding(
    @Request() req: any,
    @Param('buildingId') buildingId: string,
  ) {
    return this.flatService.findAllByBuilding(buildingId, req.orgContext);
  }
}

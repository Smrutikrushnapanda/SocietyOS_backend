import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from './organization.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { OrganizationService } from './organization.service';
import { Organization } from '../database/entities/organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { ProvisionOrganizationAdminDto } from './dto/provision-organization-admin.dto';

@Controller('organizations')
@ApiTags('organizations')
@UseGuards(AuthGuard, OrganizationGuard, PermissionGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get()
  @ApiResponse({ status: HttpStatus.OK, type: [Organization] })
  @RequirePermission('society:read')
  async findAll(@Request() req: any) {
    return this.organizationService.findAll(req.orgContext);
  }

  @Get(':id')
  @ApiResponse({ status: HttpStatus.OK, type: Organization })
  @RequirePermission('society:read')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.organizationService.findOne(id, req.orgContext);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, type: Organization })
  @RequirePermission('society:manage')
  async create(
    @Request() req: any,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizationService.create(dto, req.orgContext);
  }

  /**
   * Provision a SOCIETY_ADMIN admin user for a target organization
   * (SUPER_ADMIN only). Creates/reuses the auth User from the phone and grants
   * the membership in user_roles for the explicit target society.
   */
  @Post(':id/provision-admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED })
  @RequirePermission('admin_user:manage')
  async provisionAdmin(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ProvisionOrganizationAdminDto,
  ) {
    return this.organizationService.provisionAdmin(id, dto, req.orgContext);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Organization })
  @RequirePermission('society:manage')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationService.update(id, dto, req.orgContext);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Organization })
  @RequirePermission('society:manage')
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.organizationService.remove(id, req.orgContext);
  }
}

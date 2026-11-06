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
import { VisitorService } from './visitor.service';
import { Visitor } from '../database/entities/visitor.entity';
import { CreateVisitorDto } from './dto/create-visitor.dto';
import { UpdateVisitorDto } from './dto/update-visitor.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import {
  RequirePermission,
  RequireOrganizationId,
} from '../authorization/require-permission.decorator';

/**
 * Phase 11 Step 2: visitor endpoints are authenticated, permission-checked
 * (visitor:read / visitor:manage) and organization-scoped via req.orgContext.
 *
 * NOTE: visitor:read / visitor:manage are not present in the seeded
 * role_permissions data (no migration seeds them). Until they are seeded,
 * these endpoints are fail-closed for every role.
 */
@Controller('visitors')
@ApiTags('visitors')
@UseGuards(AuthGuard, OrganizationGuard, PermissionGuard)
export class VisitorController {
  constructor(private readonly visitorService: VisitorService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, type: Visitor })
  @RequirePermission('visitor:manage')
  @RequireOrganizationId()
  async createVisitor(@Request() req: any, @Body() createVisitorDto: CreateVisitorDto) {
    return this.visitorService.createVisitor(
      {
        organization_id: req.orgContext.organizationId,
        name: createVisitorDto.name,
        mobile: createVisitorDto.mobile,
        active: createVisitorDto.active,
      },
      req.orgContext,
    );
  }

  @Get()
  @ApiResponse({ status: HttpStatus.OK, type: [Visitor] })
  @RequirePermission('visitor:read')
  @RequireOrganizationId()
  async findAllVisitors(@Request() req: any) {
    return this.visitorService.findAll(req.orgContext);
  }

  @Get(':id')
  @ApiResponse({ status: HttpStatus.OK, type: Visitor })
  @RequirePermission('visitor:read')
  @RequireOrganizationId()
  async findVisitor(@Request() req: any, @Param('id') id: string) {
    return this.visitorService.findOne(id, req.orgContext);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Visitor })
  @RequirePermission('visitor:manage')
  @RequireOrganizationId()
  async updateVisitor(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateVisitorDto: UpdateVisitorDto,
  ) {
    return this.visitorService.update(id, updateVisitorDto, req.orgContext);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Visitor })
  @RequirePermission('visitor:manage')
  @RequireOrganizationId()
  async removeVisitor(@Request() req: any, @Param('id') id: string) {
    return this.visitorService.remove(id, req.orgContext);
  }
}

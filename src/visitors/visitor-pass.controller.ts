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
import { VisitorPassService } from './visitor-pass.service';
import { VisitorPass } from '../database/entities/visitor-pass.entity';
import { CreateVisitorPassDto } from './dto/create-visitor-pass.dto';
import { UpdateVisitorPassDto } from './dto/update-visitor-pass.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import {
  RequirePermission,
  RequireOrganizationId,
} from '../authorization/require-permission.decorator';

/**
 * Phase 11 Step 2: visitor-pass endpoints are authenticated, permission-checked
 * (visitor:read / visitor:manage) and organization-scoped via req.orgContext.
 *
 * NOTE: visitor:read / visitor:manage are not present in the seeded
 * role_permissions data (no migration seeds them). Until they are seeded,
 * these endpoints are fail-closed for every role.
 */
@Controller('visitor-passes')
@ApiTags('visitor-passes')
@UseGuards(AuthGuard, OrganizationGuard, PermissionGuard)
export class VisitorPassController {
  constructor(private readonly visitorPassService: VisitorPassService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, type: VisitorPass })
  @RequirePermission('visitor:manage')
  @RequireOrganizationId()
  async createVisitorPass(
    @Request() req: any,
    @Body() createVisitorPassDto: CreateVisitorPassDto,
  ) {
    return this.visitorPassService.createVisitorPass(
      {
        organization_id: req.orgContext.organizationId,
        visitor_id: createVisitorPassDto.visitor_id,
        visitor_visit_id: createVisitorPassDto.visitor_visit_id,
        issuer: createVisitorPassDto.issuer,
        pass_status: createVisitorPassDto.pass_status,
        validity_start: createVisitorPassDto.validity_start as any,
        validity_end: createVisitorPassDto.validity_end as any,
      },
      req.orgContext,
    );
  }

  @Get()
  @ApiResponse({ status: HttpStatus.OK, type: [VisitorPass] })
  @RequirePermission('visitor:read')
  @RequireOrganizationId()
  async findAllVisitorPasses(@Request() req: any) {
    return this.visitorPassService.findAll(req.orgContext);
  }

  @Get(':id')
  @ApiResponse({ status: HttpStatus.OK, type: VisitorPass })
  @RequirePermission('visitor:read')
  @RequireOrganizationId()
  async findVisitorPass(@Request() req: any, @Param('id') id: string) {
    return this.visitorPassService.findOne(id, req.orgContext);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: VisitorPass })
  @RequirePermission('visitor:manage')
  @RequireOrganizationId()
  async updateVisitorPass(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateVisitorPassDto: UpdateVisitorPassDto,
  ) {
    return this.visitorPassService.update(id, updateVisitorPassDto, req.orgContext);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: VisitorPass })
  @RequirePermission('visitor:manage')
  @RequireOrganizationId()
  async removeVisitorPass(@Request() req: any, @Param('id') id: string) {
    return this.visitorPassService.remove(id, req.orgContext);
  }
}

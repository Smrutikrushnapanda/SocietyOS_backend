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
import { VisitorApprovalService } from './visitor-approval.service';
import { VisitorApproval } from '../database/entities/visitor-approval.entity';
import { CreateVisitorApprovalDto } from './dto/create-visitor-approval.dto';
import { UpdateVisitorApprovalDto } from './dto/update-visitor-approval.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import {
  RequirePermission,
  RequireOrganizationId,
} from '../authorization/require-permission.decorator';

/**
 * Phase 11 Step 2: visitor-approval endpoints are authenticated,
 * permission-checked (visitor:read / visitor:manage) and organization-scoped
 * via req.orgContext.
 *
 * NOTE: visitor:read / visitor:manage are not present in the seeded
 * role_permissions data (no migration seeds them). Until they are seeded,
 * these endpoints are fail-closed for every role.
 */
@Controller('visitor-approvals')
@ApiTags('visitor-approvals')
@UseGuards(AuthGuard, OrganizationGuard, PermissionGuard)
export class VisitorApprovalController {
  constructor(
    private readonly visitorApprovalService: VisitorApprovalService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, type: VisitorApproval })
  @RequirePermission('visitor:manage')
  @RequireOrganizationId()
  async createVisitorApproval(
    @Request() req: any,
    @Body() createVisitorApprovalDto: CreateVisitorApprovalDto,
  ) {
    return this.visitorApprovalService.createVisitorApproval(
      {
        organization_id: req.orgContext.organizationId,
        visitor_visit_id: createVisitorApprovalDto.visitor_visit_id,
        approval_status: createVisitorApprovalDto.approval_status,
        approver_id: createVisitorApprovalDto.approver_id,
        approved_at: createVisitorApprovalDto.approved_at,
        rejected_at: createVisitorApprovalDto.rejected_at,
      },
      req.orgContext,
    );
  }

  @Get()
  @ApiResponse({ status: HttpStatus.OK, type: [VisitorApproval] })
  @RequirePermission('visitor:read')
  @RequireOrganizationId()
  async findAllVisitorApprovals(@Request() req: any) {
    return this.visitorApprovalService.findAll(req.orgContext);
  }

  @Get(':id')
  @ApiResponse({ status: HttpStatus.OK, type: VisitorApproval })
  @RequirePermission('visitor:read')
  @RequireOrganizationId()
  async findVisitorApproval(@Request() req: any, @Param('id') id: string) {
    return this.visitorApprovalService.findOne(id, req.orgContext);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: VisitorApproval })
  @RequirePermission('visitor:manage')
  @RequireOrganizationId()
  async updateVisitorApproval(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateVisitorApprovalDto: UpdateVisitorApprovalDto,
  ) {
    return this.visitorApprovalService.update(
      id,
      updateVisitorApprovalDto,
      req.orgContext,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: VisitorApproval })
  @RequirePermission('visitor:manage')
  @RequireOrganizationId()
  async removeVisitorApproval(@Request() req: any, @Param('id') id: string) {
    return this.visitorApprovalService.remove(id, req.orgContext);
  }
}

import { ResidentPageDto } from '../common/resident-page';
import { Query as FeedQuery } from '@nestjs/common';
import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import type { OrganizationContext } from '../organization/organization-context.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { RequireOrganizationId } from '../authorization/require-permission.decorator';
import { ComplaintService } from './complaint.service';
import { CreateComplaintDto } from './dto';
import { UpdateComplaintDto } from './dto';
import {
  CreatePriorityConfigDto,
  UpdatePriorityConfigDto,
} from './dto/priority.dto';
import { Complaint } from '../database/entities/complaint.entity';
import { ComplaintPriorityConfig } from '../database/entities/complaint-priority-config.entity';

/**
 * Phase 11 Step 2: PermissionGuard enforces the @RequirePermission metadata
 * against the user's role permissions in the target organization.
 */
@Controller('complaints')
@UseGuards(AuthGuard, OrganizationGuard, PermissionGuard)
export class ComplaintController {
  constructor(private readonly complaintService: ComplaintService) {}

  @Get('my/page')
  @RequirePermission('complaint:my')
  @RequireOrganizationId()
  findMyPage(@Request() req: any, @FeedQuery() query: ResidentPageDto) {
    return this.complaintService.findMyPage(req.user.id, req.orgContext, query);
  }

  @Get('priorities')
  @RequirePermission('complaint:read')
  @RequireOrganizationId()
  async getPriorities(
    @Request() req: { user: { id: string }; orgContext: OrganizationContext },
  ): Promise<ComplaintPriorityConfig[]> {
    return this.complaintService.findAllPriorities(req.orgContext);
  }

  @Post('priorities')
  @RequirePermission('complaint:manage')
  @RequireOrganizationId()
  async createPriority(
    @Request() req: { user: { id: string }; orgContext: OrganizationContext },
    @Body() dto: CreatePriorityConfigDto,
  ): Promise<ComplaintPriorityConfig> {
    return this.complaintService.createPriority(dto, req.orgContext);
  }

  @Put('priorities/:id')
  @RequirePermission('complaint:manage')
  @RequireOrganizationId()
  async updatePriority(
    @Request() req: { user: { id: string }; orgContext: OrganizationContext },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePriorityConfigDto,
  ): Promise<ComplaintPriorityConfig> {
    return this.complaintService.updatePriority(id, dto, req.orgContext);
  }

  @Delete('priorities/:id')
  @RequirePermission('complaint:manage')
  @RequireOrganizationId()
  async deletePriority(
    @Request() req: { user: { id: string }; orgContext: OrganizationContext },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ deleted: boolean }> {
    return this.complaintService.deletePriority(id, req.orgContext);
  }

  @Post()
  @RequirePermission('complaint:create')
  @RequireOrganizationId()
  async create(
    @Body() createDto: CreateComplaintDto,
    @Request() req: { user: { id: string }; orgContext: OrganizationContext },
  ): Promise<Complaint> {
    const authenticatedResidentId = req.user?.id;
    const orgContext = req.orgContext;
    return this.complaintService.create(
      createDto,
      authenticatedResidentId,
      orgContext,
    );
  }

  @Get('my')
  @RequirePermission('complaint:my')
  @RequireOrganizationId()
  async findMyComplaints(
    @Request() req: { user: { id: string }; orgContext: OrganizationContext },
  ): Promise<Complaint[]> {
    return this.complaintService.findMyComplaints(req.user?.id, req.orgContext);
  }

  @Get()
  @RequirePermission('complaint:manage')
  @RequireOrganizationId()
  async findAll(
    @Request() req: { user: { id: string }; orgContext: OrganizationContext },
  ): Promise<Complaint[]> {
    return this.complaintService.findAll(req.orgContext);
  }

  @Get('actionable-count')
  @RequirePermission('complaint:manage')
  @RequireOrganizationId()
  async actionableCount(
    @Request() req: { user: { id: string }; orgContext: OrganizationContext },
  ): Promise<{ count: number }> {
    return this.complaintService.actionableCount(req.orgContext);
  }

  @Get('my/:id/history')
  @RequirePermission('complaint:my')
  @RequireOrganizationId()
  residentHistory(
    @Request() req: { user: { id: string }; orgContext: OrganizationContext },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.complaintService.residentHistory(
      id,
      req.user.id,
      req.orgContext,
    );
  }

  @Get(':id')
  @RequirePermission('complaint:manage')
  @RequireOrganizationId()
  async findOne(
    @Request() req: { user: { id: string }; orgContext: OrganizationContext },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Complaint | null> {
    return this.complaintService.findOne(id, req.orgContext);
  }

  @Put(':id')
  @RequirePermission('complaint:manage')
  @RequireOrganizationId()
  async update(
    @Request() req: { user: { id: string }; orgContext: OrganizationContext },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateComplaintDto,
  ): Promise<Complaint | null> {
    return this.complaintService.update(id, updateDto, {
      ...req.orgContext,
      actorUserId: req.user.id,
    });
  }

  @Put(':id/assign')
  @RequirePermission('complaint:manage')
  @RequireOrganizationId()
  async assign(
    @Request() req: { user: { id: string }; orgContext: OrganizationContext },
    @Param('id', ParseUUIDPipe) id: string,
    @Body('assigned_to', ParseUUIDPipe) assignedTo: string,
  ): Promise<Complaint | null> {
    return this.complaintService.assign(id, assignedTo, {
      ...req.orgContext,
      actorUserId: req.user.id,
    });
  }

  @Put(':id/resolve')
  @RequirePermission('complaint:manage')
  @RequireOrganizationId()
  async resolve(
    @Request() req: { user: { id: string }; orgContext: OrganizationContext },
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ): Promise<Complaint | null> {
    return this.complaintService.resolve(id, reason, {
      ...req.orgContext,
      actorUserId: req.user.id,
    });
  }
}

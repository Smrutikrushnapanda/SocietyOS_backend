import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { RequireOrganizationId } from '../authorization/require-permission.decorator';
import { ComplaintService } from './complaint.service';
import { CreateComplaintDto } from './dto';
import { UpdateComplaintDto } from './dto';
import { Complaint } from '../database/entities/complaint.entity';

@Controller('complaints')
@UseGuards(AuthGuard, OrganizationGuard)
export class ComplaintController {
  constructor(private readonly complaintService: ComplaintService) {}

  @Post()
  @RequirePermission('complaint:create')
  @RequireOrganizationId()
  async create(@Body() createDto: CreateComplaintDto, @Request() req: any): Promise<Complaint> {
    const authenticatedResidentId = req.user?.id;
    const orgContext = req.orgContext;
    return this.complaintService.create(createDto, authenticatedResidentId, orgContext);
  }

  @Get()
  @RequirePermission('complaint:read')
  @RequireOrganizationId()
  async findAll(@Request() req: any): Promise<Complaint[]> {
    return this.complaintService.findAll(req.orgContext);
  }

  @Get(':id')
  @RequirePermission('complaint:read')
  @RequireOrganizationId()
  async findOne(@Request() req: any, @Param('id') id: string): Promise<Complaint | null> {
    return this.complaintService.findOne(id, req.orgContext);
  }

  @Put(':id')
  @RequirePermission('complaint:manage')
  @RequireOrganizationId()
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateComplaintDto,
  ): Promise<Complaint | null> {
    return this.complaintService.update(id, updateDto, req.orgContext);
  }

  @Put(':id/assign')
  @RequirePermission('complaint:manage')
  @RequireOrganizationId()
  async assign(
    @Request() req: any,
    @Param('id') id: string,
    @Body('assigned_to') assignedTo: string,
  ): Promise<Complaint | null> {
    return this.complaintService.assign(id, assignedTo, req.orgContext);
  }

  @Put(':id/resolve')
  @RequirePermission('complaint:manage')
  @RequireOrganizationId()
  async resolve(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<Complaint | null> {
    return this.complaintService.resolve(id, reason, req.orgContext);
  }
}
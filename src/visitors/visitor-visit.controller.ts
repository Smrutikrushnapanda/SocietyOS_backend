import { ResidentPageDto } from '../common/resident-page';
import { Query as FeedQuery } from '@nestjs/common';
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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { VisitorVisitService } from './visitor-visit.service';
import { VisitorVisit } from '../database/entities/visitor-visit.entity';
import { CreateVisitorVisitDto } from './dto/create-visitor-visit.dto';
import { UpdateVisitorVisitDto } from './dto/update-visitor-visit.dto';
import { PreApproveVisitorVisitDto } from './dto/pre-approve-visitor-visit.dto';
import { DecideMyVisitorVisitDto } from './dto/decide-my-visitor-visit.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import {
  RequirePermission,
  RequireOrganizationId,
} from '../authorization/require-permission.decorator';

/**
 * Phase 11 Step 2: visitor-visit endpoints are authenticated, permission-checked
 * (visitor:read / visitor:manage) and organization-scoped via req.orgContext.
 *
 * NOTE: visitor:read / visitor:manage are not present in the seeded
 * role_permissions data (no migration seeds them). Until they are seeded,
 * these endpoints are fail-closed for every role.
 */
@Controller('visitor-visits')
@ApiTags('visitor-visits')
@UseGuards(AuthGuard, OrganizationGuard, PermissionGuard)
export class VisitorVisitController {
  constructor(private readonly visitorVisitService: VisitorVisitService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, type: VisitorVisit })
  @RequirePermission('visitor:manage')
  @RequireOrganizationId()
  async createVisitorVisit(
    @Request() req: any,
    @Body() createVisitorVisitDto: CreateVisitorVisitDto,
  ) {
    return this.visitorVisitService.createVisitorVisit(
      {
        organization_id: req.orgContext.organizationId,
        visitor_id: createVisitorVisitDto.visitor_id,
        host_resident_id: createVisitorVisitDto.host_resident_id,
        visit_status: createVisitorVisitDto.visit_status,
        visit_purpose: createVisitorVisitDto.visit_purpose,
        expected_entry_time: createVisitorVisitDto.expected_entry_time as any,
      },
      req.orgContext,
    );
  }

  @Get('my/page')
  @RequirePermission('visitor:my')
  @RequireOrganizationId()
  findMyPage(@Request() req: any, @FeedQuery() query: ResidentPageDto) {
    return this.visitorVisitService.findMyPage(req.user.id, req.orgContext, query);
  }

  @Get('my')
  @ApiResponse({ status: HttpStatus.OK, type: [VisitorVisit] })
  @RequirePermission('visitor:my')
  @RequireOrganizationId()
  async findMyVisits(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.visitorVisitService.findMyVisits(userId, req.orgContext);
  }

  @Post('pre-approve')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, type: VisitorVisit })
  @RequirePermission('visitor:preapprove')
  @RequireOrganizationId()
  async preApproveVisit(
    @Request() req: any,
    @Body() dto: PreApproveVisitorVisitDto,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.visitorVisitService.preApproveVisit(
      dto,
      userId,
      req.orgContext,
    );
  }

  @Patch('my/:id/decision')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: VisitorVisit })
  @RequirePermission('visitor:my')
  @RequireOrganizationId()
  async decideMyVisit(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideMyVisitorVisitDto,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.visitorVisitService.decideMyVisit(
      id,
      dto.decision,
      userId,
      req.orgContext,
    );
  }

  @Get(':id/pass')
  @ApiResponse({ status: HttpStatus.OK })
  @RequirePermission('visitor:my')
  @RequireOrganizationId()
  async getVisitPass(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.visitorVisitService.getVisitPass(id, userId, req.orgContext);
  }

  @Post(':id/send-whatsapp')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK })
  @RequirePermission('visitor:my')
  @RequireOrganizationId()
  async sendVisitPassWhatsApp(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.visitorVisitService.sendVisitPassWhatsApp(
      id,
      userId,
      req.orgContext,
    );
  }

  @Get()
  @ApiResponse({ status: HttpStatus.OK, type: [VisitorVisit] })
  @RequirePermission('visitor:read')
  @RequireOrganizationId()
  async findAllVisitorVisits(@Request() req: any) {
    return this.visitorVisitService.findAll(req.orgContext);
  }

  @Get(':id')
  @ApiResponse({ status: HttpStatus.OK, type: VisitorVisit })
  @RequirePermission('visitor:read')
  @RequireOrganizationId()
  async findVisitorVisit(@Request() req: any, @Param('id') id: string) {
    return this.visitorVisitService.findOne(id, req.orgContext);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: VisitorVisit })
  @RequirePermission('visitor:manage')
  @RequireOrganizationId()
  async updateVisitorVisit(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateVisitorVisitDto: UpdateVisitorVisitDto,
  ) {
    return this.visitorVisitService.update(
      id,
      {
        ...updateVisitorVisitDto,
        expected_entry_time: updateVisitorVisitDto.expected_entry_time
          ? new Date(updateVisitorVisitDto.expected_entry_time)
          : undefined,
      },
      req.orgContext,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: VisitorVisit })
  @RequirePermission('visitor:manage')
  @RequireOrganizationId()
  async removeVisitorVisit(@Request() req: any, @Param('id') id: string) {
    return this.visitorVisitService.remove(id, req.orgContext);
  }
}

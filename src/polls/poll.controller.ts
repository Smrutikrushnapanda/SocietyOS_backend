import { CollectionPageDto, PollPageDto } from '../common/pagination.dto';
import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Body,
  BadRequestException,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { RequireOrganizationId } from '../authorization/require-permission.decorator';
import { PollService } from './poll.service';
import { CreatePollDto } from './dto';
import { VotePollDto } from './dto';
import { EditPollDto } from './dto';
import { Poll } from '../database/entities/poll.entity';

/**
 * Phase 11 Step 2: PermissionGuard enforces the @RequirePermission metadata
 * against the user's role permissions in the target organization.
 */
@Controller('polls')
@UseGuards(AuthGuard, OrganizationGuard, PermissionGuard)
export class PollController {
  constructor(private readonly pollService: PollService) {}

  @Post()
  @RequirePermission('poll:manage')
  @RequireOrganizationId()
  async create(@Body() createDto: CreatePollDto, @Request() req: any): Promise<Poll> {
    const authenticatedUserId = req.user?.id;
    const orgContext = req.orgContext;
    return this.pollService.create(createDto, authenticatedUserId, orgContext);
  }

  @Get()
  @RequirePermission('poll:read')
  @RequireOrganizationId()
  async findAll(@Request() req: any): Promise<Poll[]> {
    return this.pollService.findAll(req.orgContext);
  }

  @Get('page')
  @RequirePermission('poll:read')
  @RequireOrganizationId()
  findPage(@Request() req: any, @Query() query: PollPageDto) {
    return this.pollService.findPage(req.orgContext, query, req.user.id);
  }

  @Get(':id')
  @RequirePermission('poll:read')
  @RequireOrganizationId()
  async findOne(@Request() req: any, @Param('id') id: string): Promise<Poll | null> {
    return this.pollService.findOne(id, req.orgContext);
  }

  @Put(':id/start')
  @RequirePermission('poll:manage')
  @RequireOrganizationId()
  async start(@Request() req: any, @Param('id') id: string): Promise<Poll | null> {
    return this.pollService.start(id, req.orgContext);
  }

  @Patch(':id')
  @RequirePermission('poll:manage')
  @RequireOrganizationId()
  edit(@Request() req: any, @Param('id') id: string, @Body() dto: EditPollDto): Promise<Poll> {
    return this.pollService.edit(id, dto, req.orgContext);
  }

  @Put(':id/end')
  @RequirePermission('poll:manage')
  @RequireOrganizationId()
  async end(@Request() req: any, @Param('id') id: string): Promise<Poll | null> {
    return this.pollService.end(id, req.orgContext);
  }

  @Post(':id/vote')
  @RequirePermission('poll:vote')
  @RequireOrganizationId()
  async vote(@Request() req: any, @Body() voteDto: VotePollDto, @Param('id') pollId?: string): Promise<any> {
    if (pollId && pollId !== voteDto.poll_id) throw new BadRequestException('Poll ID must match request path');
    const authenticatedResidentId = req.user?.id;
    return this.pollService.vote(voteDto, authenticatedResidentId, req.orgContext);
  }

  @Get(':id/results')
  @RequirePermission('poll:read')
  @RequireOrganizationId()
  async getResults(@Request() req: any, @Param('id') id: string): Promise<any> {
    return this.pollService.getResults(id, req.orgContext);
  }
}

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
import { PollService } from './poll.service';
import { CreatePollDto } from './dto';
import { VotePollDto } from './dto';
import { UpdatePollDto } from './dto';
import { Poll } from '../database/entities/poll.entity';

@Controller('polls')
@UseGuards(AuthGuard, OrganizationGuard)
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

  @Put(':id/end')
  @RequirePermission('poll:manage')
  @RequireOrganizationId()
  async end(@Request() req: any, @Param('id') id: string): Promise<Poll | null> {
    return this.pollService.end(id, req.orgContext);
  }

  @Post(':id/vote')
  @RequirePermission('poll:vote')
  @RequireOrganizationId()
  async vote(@Request() req: any, @Body() voteDto: VotePollDto): Promise<any> {
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
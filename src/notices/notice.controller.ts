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
import { NoticeService } from './notice.service';
import { CreateNoticeDto } from './dto';
import { UpdateNoticeDto } from './dto';
import { Notice } from '../database/entities/notice.entity';

@Controller('notices')
@UseGuards(AuthGuard, OrganizationGuard)
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) {}

  @Post()
  @RequirePermission('notice:publish')
  @RequireOrganizationId()
  async create(@Body() createDto: CreateNoticeDto, @Request() req: any): Promise<Notice> {
    const authenticatedUserId = req.user?.id;
    const orgContext = req.orgContext;
    return this.noticeService.create(createDto, authenticatedUserId, orgContext);
  }

  @Get()
  @RequirePermission('notice:read')
  @RequireOrganizationId()
  async findAll(@Request() req: any): Promise<Notice[]> {
    return this.noticeService.findAll(req.orgContext);
  }

  @Get(':id')
  @RequirePermission('notice:read')
  @RequireOrganizationId()
  async findOne(@Request() req: any, @Param('id') id: string): Promise<Notice | null> {
    return this.noticeService.findOne(id, req.orgContext);
  }

  @Put(':id/publish')
  @RequirePermission('notice:publish')
  @RequireOrganizationId()
  async publish(@Request() req: any, @Param('id') id: string): Promise<Notice | null> {
    return this.noticeService.publish(id, req.orgContext);
  }

  @Put(':id/expire')
  @RequirePermission('notice:publish')
  @RequireOrganizationId()
  async expire(@Request() req: any, @Param('id') id: string): Promise<Notice | null> {
    return this.noticeService.expire(id, req.orgContext);
  }
}
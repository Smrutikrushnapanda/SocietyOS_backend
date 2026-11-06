import { CollectionPageDto, NoticePageDto } from '../common/pagination.dto';
import {
  NoticeWorkflowService,
  type NoticeUpload,
} from './notice-workflow.service';
import { ScheduleNoticeDto, PublishNoticeDto } from './dto';
import type { AuditOrganizationContextLike } from '../audit/audit-context';
import type { Response as ExpressResponse } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  Delete,
  ParseUUIDPipe,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
interface NoticeRequest {
  user: { id: string };
  orgContext: AuditOrganizationContextLike;
}
import {
  Query,
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { RequireOrganizationId } from '../authorization/require-permission.decorator';
import { NoticeService } from './notice.service';
import { CreateNoticeDto } from './dto';
import { UpdateNoticeDto } from './dto';
import { Notice } from '../database/entities/notice.entity';

/**
 * Phase 11 Step 2: PermissionGuard enforces the @RequirePermission metadata
 * against the user's role permissions in the target organization.
 */
@Controller('notices')
@UseGuards(AuthGuard, OrganizationGuard, PermissionGuard)
export class NoticeController {
  constructor(
    private readonly noticeService: NoticeService,
    private readonly workflow: NoticeWorkflowService,
  ) {}

  @Post()
  @RequirePermission('notice:publish')
  @RequireOrganizationId()
  async create(
    @Body() createDto: CreateNoticeDto,
    @Request() req: NoticeRequest,
  ): Promise<Notice> {
    await this.workflow.access(req.orgContext, req.user.id, true);
    const authenticatedUserId = req.user.id;
    const orgContext = req.orgContext;
    return this.noticeService.create(
      createDto,
      authenticatedUserId,
      orgContext,
    );
  }

  @Get()
  @RequirePermission('notice:read')
  @RequireOrganizationId()
  async findAll(@Request() req: any): Promise<Notice[]> {
    return this.noticeService.findAll(req.orgContext, req.user?.id);
  }

  @Get('page')
  @RequirePermission('notice:read')
  @RequireOrganizationId()
  findPage(@Request() req: any, @Query() query: NoticePageDto) {
    return this.noticeService.findPage(req.orgContext, req.user.id, query);
  }

  @Get('capabilities')
  @RequirePermission('notice:publish')
  @RequireOrganizationId()
  capabilities() {
    return {
      scheduledPublication: process.env.NOTICE_SCHEDULER_ENABLED === 'true',
      deliveryWorker: process.env.NOTICE_DELIVERY_ENABLED === 'true',
      pushDispatch: process.env.FCM_DISPATCH_ENABLED === 'true',
    };
  }

  @Put(':id')
  @RequirePermission('notice:publish')
  @RequireOrganizationId()
  update(
    @Request() req: NoticeRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateNoticeDto,
  ) {
    return this.workflow.update(id, body, req.orgContext, req.user.id);
  }

  @Put(':id/schedule')
  @RequirePermission('notice:publish')
  @RequireOrganizationId()
  schedule(
    @Request() req: NoticeRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ScheduleNoticeDto,
  ) {
    return this.workflow.schedule(id, body, req.orgContext, req.user.id);
  }

  @Delete(':id/schedule')
  @RequirePermission('notice:publish')
  @RequireOrganizationId()
  cancelSchedule(
    @Request() req: NoticeRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workflow.cancelSchedule(id, req.orgContext, req.user.id);
  }

  @Post(':id/attachments')
  @RequirePermission('notice:publish')
  @RequireOrganizationId()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 0 },
    }),
  )
  uploadAttachment(
    @Request() req: NoticeRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file?: NoticeUpload,
  ) {
    return this.workflow.upload(id, file, req.orgContext, req.user.id);
  }

  @Get(':id/attachments')
  @RequirePermission('notice:read')
  @RequireOrganizationId()
  attachments(
    @Request() req: NoticeRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workflow.attachments(id, req.orgContext, req.user.id);
  }

  @Get(':id/attachments/:fileId')
  @RequirePermission('notice:read')
  @RequireOrganizationId()
  async downloadAttachment(
    @Request() req: NoticeRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Res() response: ExpressResponse,
  ) {
    const { metadata, buffer } = await this.workflow.download(
      id,
      fileId,
      req.orgContext,
      req.user.id,
    );
    response.setHeader('Content-Type', 'application/octet-stream');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(metadata.original_filename).replace(/'/g, '%27')}`,
    );
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'private, no-store');
    response.send(buffer);
  }

  @Delete(':id/attachments/:fileId')
  @RequirePermission('notice:publish')
  @RequireOrganizationId()
  removeAttachment(
    @Request() req: NoticeRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ) {
    return this.workflow.removeAttachment(
      id,
      fileId,
      req.orgContext,
      req.user.id,
    );
  }

  @Get(':id')
  @RequirePermission('notice:read')
  @RequireOrganizationId()
  async findOne(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<Notice | null> {
    return this.noticeService.findOne(id, req.orgContext, req.user?.id);
  }

  @Put(':id/publish')
  @RequirePermission('notice:publish')
  @RequireOrganizationId()
  async publish(
    @Request() req: NoticeRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: PublishNoticeDto,
  ): Promise<Notice | null> {
    await this.workflow.access(req.orgContext, req.user.id, true);
    return this.noticeService.publish(
      id,
      req.orgContext,
      body?.confirmEmergency === true,
    );
  }

  @Put(':id/expire')
  @RequirePermission('notice:publish')
  @RequireOrganizationId()
  async expire(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<Notice | null> {
    return this.noticeService.expire(id, req.orgContext);
  }
}

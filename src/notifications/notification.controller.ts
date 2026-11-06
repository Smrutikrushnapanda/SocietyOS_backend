import {
  Controller,
  Get,
  Patch,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import type { OrganizationContext } from '../organization/organization-context.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import {
  RequirePermission,
  RequireOrganizationId,
} from '../authorization/require-permission.decorator';
import { NotificationService } from './notification.service';

/**
 * Phase 11 Step 2: PermissionGuard enforces the @RequirePermission metadata
 * against the user's role permissions in the target organization.
 */
@Controller('notifications')
@UseGuards(AuthGuard, OrganizationGuard, PermissionGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @RequirePermission('notification:read')
  @RequireOrganizationId()
  async findAll(
    @Request()
    req: {
      user: { id: string };
      orgContext: OrganizationContext & { organizationId: string };
    },
  ) {
    const userId: string = req.user.id;
    const organizationId: string = req.orgContext.organizationId;
    return this.notificationService.findAllForUser(userId, organizationId);
  }

  @Get('page')
  @RequirePermission('notification:read')
  @RequireOrganizationId()
  page(
    @Request()
    req: {
      user: { id: string };
      orgContext: OrganizationContext & { organizationId: string };
    },
    @Query('page') page?: string,
    @Query('unread') unread?: string,
    @Query('state') state?: string,
  ) {
    return this.notificationService.page(
      req.user.id,
      req.orgContext.organizationId,
      page === undefined ? 1 : Number(page),
      unread === 'true',
      state,
    );
  }

  @Get(':id')
  @RequirePermission('notification:read')
  @RequireOrganizationId()
  async findOne(
    @Request()
    req: {
      user: { id: string };
      orgContext: OrganizationContext & { organizationId: string };
    },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId: string = req.user.id;
    const organizationId: string = req.orgContext.organizationId;
    return this.notificationService.findOneForUser(id, userId, organizationId);
  }

  @Patch('read-all')
  @RequirePermission('notification:read')
  @RequireOrganizationId()
  async markAllRead(
    @Request()
    req: {
      user: { id: string };
      orgContext: OrganizationContext & { organizationId: string };
    },
  ) {
    const userId: string = req.user.id;
    const organizationId: string = req.orgContext.organizationId;
    await this.notificationService.markAllRead(userId, organizationId);
    return { message: 'All notifications marked as read' };
  }

  @Patch(':id/read')
  @RequirePermission('notification:read')
  @RequireOrganizationId()
  async markRead(
    @Request()
    req: {
      user: { id: string };
      orgContext: OrganizationContext & { organizationId: string };
    },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId: string = req.user.id;
    const organizationId: string = req.orgContext.organizationId;
    return this.notificationService.markRead(id, userId, organizationId);
  }
}

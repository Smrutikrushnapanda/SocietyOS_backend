import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { RequirePermission, RequireOrganizationId } from '../authorization/require-permission.decorator';
import { NotificationService } from './notification.service';

@Controller('notifications')
@UseGuards(AuthGuard, OrganizationGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @RequirePermission('notification:read')
  @RequireOrganizationId()
  async findAll(@Request() req: any) {
    const userId: string = req.user.id;
    const organizationId: string = req.orgContext.organizationId;
    return this.notificationService.findAllForUser(userId, organizationId);
  }

  @Get(':id')
  @RequirePermission('notification:read')
  @RequireOrganizationId()
  async findOne(@Request() req: any, @Param('id') id: string) {
    const userId: string = req.user.id;
    const organizationId: string = req.orgContext.organizationId;
    return this.notificationService.findOneForUser(id, userId, organizationId);
  }

  @Patch('read-all')
  @RequirePermission('notification:read')
  @RequireOrganizationId()
  async markAllRead(@Request() req: any) {
    const userId: string = req.user.id;
    const organizationId: string = req.orgContext.organizationId;
    await this.notificationService.markAllRead(userId, organizationId);
    return { message: 'All notifications marked as read' };
  }

  @Patch(':id/read')
  @RequirePermission('notification:read')
  @RequireOrganizationId()
  async markRead(@Request() req: any, @Param('id') id: string) {
    const userId: string = req.user.id;
    const organizationId: string = req.orgContext.organizationId;
    return this.notificationService.markRead(id, userId, organizationId);
  }
}

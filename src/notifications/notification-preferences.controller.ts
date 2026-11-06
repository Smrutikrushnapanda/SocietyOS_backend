import {
  Body,
  Controller,
  Get,
  Patch,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import {
  RequireOrganizationId,
  RequirePermission,
} from '../authorization/require-permission.decorator';
import type { OrganizationContext } from '../organization/organization-context.service';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { NotificationPreferencesService } from './notification-preferences.service';

interface PreferenceRequest {
  user: { id: string };
  orgContext: OrganizationContext & { organizationId: string };
}

@Controller('notification-preferences')
@UseGuards(AuthGuard, OrganizationGuard, PermissionGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class NotificationPreferencesController {
  constructor(private readonly preferences: NotificationPreferencesService) {}

  @Get()
  @RequirePermission('notification:read')
  @RequireOrganizationId()
  read(@Request() request: PreferenceRequest) {
    return this.preferences.read(
      request.user.id,
      request.orgContext.organizationId,
    );
  }

  @Patch()
  @RequirePermission('notification:read')
  @RequireOrganizationId()
  update(
    @Request() request: PreferenceRequest,
    @Body() body: UpdateNotificationPreferencesDto,
  ) {
    return this.preferences.update(
      request.user.id,
      request.orgContext.organizationId,
      body,
    );
  }
}

import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import {
  RequirePermission,
  RequireOrganizationId,
} from '../authorization/require-permission.decorator';
import { PushTokenService } from './push-token.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import type { OrganizationContext } from '../organization/organization-context.service';

interface TokenRequest {
  user: { id: string };
  orgContext: Pick<OrganizationContext, 'organizationId'>;
}

/**
 * Phase 11 Step 2: PermissionGuard enforces the @RequirePermission metadata
 * against the user's role permissions in the target organization.
 */
@Controller('push-tokens')
@UseGuards(AuthGuard, OrganizationGuard, PermissionGuard)
export class PushTokenController {
  constructor(private readonly pushTokenService: PushTokenService) {}

  @Post()
  @RequirePermission('push_token:manage')
  @RequireOrganizationId()
  async register(
    @Request() req: TokenRequest,
    @Body() dto: RegisterPushTokenDto,
  ) {
    // user_id and organization_id are NEVER taken from the request body
    const userId: string = req.user.id;
    const organizationId = req.orgContext.organizationId ?? '';
    return this.pushTokenService.register(
      userId,
      organizationId,
      dto.token,
      dto.platform,
      dto.previousTokenId,
    );
  }

  @Delete(':id')
  @RequirePermission('push_token:manage')
  @RequireOrganizationId()
  async deactivate(
    @Request() req: TokenRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId: string = req.user.id;
    const organizationId = req.orgContext.organizationId ?? '';
    await this.pushTokenService.deactivate(id, userId, organizationId);
    return { message: 'Push token deactivated' };
  }
}

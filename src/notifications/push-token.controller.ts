import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { RequirePermission, RequireOrganizationId } from '../authorization/require-permission.decorator';
import { PushTokenService } from './push-token.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { PushTokenPlatform } from '../database/entities/push-token.entity';

@Controller('push-tokens')
@UseGuards(AuthGuard, OrganizationGuard)
export class PushTokenController {
  constructor(private readonly pushTokenService: PushTokenService) {}

  @Post()
  @RequirePermission('push_token:manage')
  @RequireOrganizationId()
  async register(@Request() req: any, @Body() dto: RegisterPushTokenDto) {
    // user_id and organization_id are NEVER taken from the request body
    const userId: string = req.user.id;
    const organizationId: string = req.orgContext.organizationId;
    const platform = (dto.platform as PushTokenPlatform) ?? PushTokenPlatform.WEB;
    return this.pushTokenService.register(userId, organizationId, dto.token, platform);
  }

  @Delete(':id')
  @RequirePermission('push_token:manage')
  @RequireOrganizationId()
  async deactivate(@Request() req: any, @Param('id') id: string) {
    const userId: string = req.user.id;
    await this.pushTokenService.deactivate(id, userId);
    return { message: 'Push token deactivated' };
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { RequireOrganizationId } from '../authorization/require-permission.decorator';
import { WhatsAppService, WhatsAppNotificationSettings } from './whatsapp.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/audit.enums';
import { extractRequestMeta, recordAudit, resolveAuditContext } from '../audit/audit-context';

import { AuthorizationService } from '../authorization/authorization.service';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class TestMessageDto {
  @IsString()
  @Matches(/^(?:\+?91[ -]?)?[6-9]\d{9}$/)
  recipientNumber: string;
}

export class UpdateWhatsAppSettingsDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
  @IsOptional()
  @IsBoolean()
  notifyVisitor?: boolean;
  @IsOptional()
  @IsBoolean()
  notifyMaintenance?: boolean;
  @IsOptional()
  @IsBoolean()
  notifyPayment?: boolean;
  @IsOptional()
  @IsBoolean()
  notifyComplaint?: boolean;
  @IsOptional()
  @IsBoolean()
  notifyNotice?: boolean;
}

@Controller('admin/whatsapp')
@ApiTags('admin/whatsapp')
@UseGuards(AuthGuard, OrganizationGuard)
export class AdminWhatsAppController {
  constructor(
    private readonly whatsAppService: WhatsAppService,
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly authorizationService?: AuthorizationService,
  ) {}

  private async assertAdminRole(req: any): Promise<void> {
    const roles: string[] = req.user?.roles || req.orgContext?.roles || [];
    const isSuperAdmin = req.orgContext?.isSuperAdmin || roles.includes('SUPER_ADMIN');
    if (isSuperAdmin) {
      return;
    }

    if (roles.includes('SOCIETY_ADMIN')) {
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new ForbiddenException('Admin access required');
    }

    const orgId = req.orgContext?.targetOrganizationId || req.orgContext?.organizationId;

    if (this.authorizationService) {
      const userRole = await this.authorizationService.getUserRole(userId, orgId || undefined);
      if (userRole?.role?.name === 'SOCIETY_ADMIN' || userRole?.role?.name === 'SUPER_ADMIN') {
        return;
      }
    }

    throw new ForbiddenException('Admin access required');
  }

  private resolveOrgId(req: any): string {
    const orgContext = req.orgContext || {};
    const targetOrgId = orgContext.isSuperAdmin
      ? orgContext.targetOrganizationId
      : orgContext.organizationId;

    if (!targetOrgId) {
      throw new ForbiddenException('Organization context required');
    }
    return targetOrgId;
  }

  @Get('status')
  @HttpCode(HttpStatus.OK)
  async getStatus(@Request() req: any) {
    await this.assertAdminRole(req);
    const health = await this.whatsAppService.getHealth();

    return {
      success: true,
      data: {
        status: health.status,
        provider: health.provider,
        sessionName: health.session,
        accountInfo: health.me
          ? {
              id: health.me.id ? health.me.id.replace(/^(\d{2})(\d{2})\d+(\d{4})(@.*)$/, '+$1 $2****$3') : undefined,
              pushName: health.me.pushName,
            }
          : null,
        lastChecked: health.lastChecked,
        error: health.details?.error,
      },
    };
  }

  @Post('test-message')
  @HttpCode(HttpStatus.OK)
  @RequireOrganizationId()
  async sendTestMessage(@Request() req: any, @Body() body: TestMessageDto) {
    await this.assertAdminRole(req);
    const orgId = this.resolveOrgId(req);
    const recipient = body?.recipientNumber;

    if (!recipient || typeof recipient !== 'string') {
      throw new BadRequestException('Recipient number is required');
    }

    const clean = recipient.replace(/\D/g, '');
    if (clean.length < 10) {
      throw new BadRequestException('Invalid recipient phone number format');
    }

    const result = await this.whatsAppService.sendTestMessage(
      clean,
      req.user.id,
      req.orgContext?.organizationName,
    );

    // Audit log recording
    if (this.auditService) {
      const meta = extractRequestMeta(req);
      const auditCtx = resolveAuditContext({
        orgContext: req.orgContext,
        actorUserId: req.user.id,
        entityOrganizationId: orgId,
      });
      void recordAudit(this.auditService as any, {
        ...auditCtx,
        action: AuditAction.CREATE,
        entity_type: AuditEntityType.MAINTENANCE_CONFIGURATION,
        entity_id: orgId,
        old_values: null,
        new_values: {
          action: 'WHATSAPP_TEST_MESSAGE_DISPATCHED',
          recipient_masked: `+91 ${clean.slice(0, 2)}****${clean.slice(-4)}`,
          success: result.success,
        },
        ...meta,
      } as never);
    }

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to deliver WhatsApp test message',
      };
    }

    return {
      success: true,
      message: 'Test message sent successfully',
      messageId: result.messageId,
    };
  }

  @Get('settings')
  @HttpCode(HttpStatus.OK)
  @RequireOrganizationId()
  async getSettings(@Request() req: any) {
    await this.assertAdminRole(req);
    const orgId = this.resolveOrgId(req);
    const settings = await this.whatsAppService.getOrgSettings(orgId);
    return {
      success: true,
      data: settings,
    };
  }

  @Put('settings')
  @HttpCode(HttpStatus.OK)
  @RequireOrganizationId()
  async updateSettings(
    @Request() req: any,
    @Body() body: UpdateWhatsAppSettingsDto,
  ) {
    await this.assertAdminRole(req);
    const orgId = this.resolveOrgId(req);
    const current = await this.whatsAppService.getOrgSettings(orgId);
    const updated = await this.whatsAppService.updateOrgSettings(orgId, body);

    // Audit log recording
    if (this.auditService) {
      const meta = extractRequestMeta(req);
      const auditCtx = resolveAuditContext({
        orgContext: req.orgContext,
        actorUserId: req.user.id,
        entityOrganizationId: orgId,
      });
      void recordAudit(this.auditService as any, {
        ...auditCtx,
        action: AuditAction.UPDATE,
        entity_type: AuditEntityType.MAINTENANCE_CONFIGURATION,
        entity_id: orgId,
        old_values: current as any,
        new_values: updated as any,
        ...meta,
      } as never);
    }

    return {
      success: true,
      data: updated,
    };
  }
}

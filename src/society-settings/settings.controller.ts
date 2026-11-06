import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post, Request, Res, UploadedFile, UseGuards, UseInterceptors, ServiceUnavailableException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { AuthorizationService } from '../authorization/authorization.service';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequireOrganizationId, RequirePermission } from '../authorization/require-permission.decorator';
import { SocietySettingsService } from './settings.service';
import { BrandingSettingsDto, EmergencyContactDto, ProfileSettingsDto, TemplateSettingsDto, TemplateTestDto } from './settings.dto';
import { FileService } from '../files/file.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Controller('society-settings')
@UseGuards(AuthGuard, OrganizationGuard)
@RequireOrganizationId()
export class SocietySettingsController {
  constructor(private readonly settings: SocietySettingsService, private readonly authorization: AuthorizationService, private readonly files: FileService, private readonly whatsapp: WhatsAppService) {}
  private async actor(req: any, admin = false) {
    const org = req.orgContext?.isSuperAdmin ? req.orgContext.targetOrganizationId : req.orgContext?.organizationId;
    if (!org) throw new ForbiddenException('Explicit society context is required');
    const membership = await this.authorization.getUserRole(req.user.id, org);
    const role = membership?.role?.name;
    if (!role || !['SUPER_ADMIN', 'SOCIETY_ADMIN', 'RESIDENT', 'GUARD'].includes(role) || (admin && !['SUPER_ADMIN', 'SOCIETY_ADMIN'].includes(role))) throw new ForbiddenException('Society access denied');
    return { org, role, user: { id: req.user.id, roles: [role] } };
  }
  @Get('public')
  async publicSettings(@Request() req: any) {
    const actor = await this.actor(req);
    const saved = await this.settings.read(actor.org);
    return { organizationId: saved.organizationId, name: saved.name, address: saved.address, profile: saved.profile, branding: saved.branding, emergencyContacts: saved.emergencyContacts.filter(contact => contact.active && (actor.role === 'RESIDENT' ? contact.residentVisible : actor.role === 'GUARD' ? contact.guardVisible : true)) };
  }
  @Get('campus-image')
  async campusImage(@Request() req: any, @Res() response: Response) {
    const actor = await this.actor(req);
    const saved = await this.settings.read(actor.org);
    if (!saved.branding.campusImageFileId) { response.status(404).end(); return; }
    const file = await this.files.retrieve(saved.branding.campusImageFileId, actor.org, actor.user);
    response.set({ 'Content-Type': file.metadata.mime_type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store' }).send(file.buffer);
  }
  @Get()
  @UseGuards(PermissionGuard) @RequirePermission('society:read')
  async read(@Request() req: any) { return this.settings.read((await this.actor(req, true)).org); }
  @Patch('profile')
  @UseGuards(PermissionGuard) @RequirePermission('society:manage')
  async profile(@Request() req: any, @Body() dto: ProfileSettingsDto) { return this.settings.profile((await this.actor(req, true)).org, dto); }
  @Patch('branding')
  @UseGuards(PermissionGuard) @RequirePermission('society:manage')
  async branding(@Request() req: any, @Body() dto: BrandingSettingsDto) { return this.settings.branding((await this.actor(req, true)).org, dto); }
  @Patch('templates')
  @UseGuards(PermissionGuard) @RequirePermission('society:manage')
  async templates(@Request() req: any, @Body() dto: TemplateSettingsDto) { return this.settings.templates((await this.actor(req, true)).org, dto); }
  @Post('contacts')
  @UseGuards(PermissionGuard) @RequirePermission('society:manage')
  async contact(@Request() req: any, @Body() dto: EmergencyContactDto) { return this.settings.contact((await this.actor(req, true)).org, dto); }
  @Patch('contacts/:id')
  @UseGuards(PermissionGuard) @RequirePermission('society:manage')
  async editContact(@Request() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: EmergencyContactDto) { return this.settings.contact((await this.actor(req, true)).org, dto, id); }
  @Delete('contacts/:id')
  @UseGuards(PermissionGuard) @RequirePermission('society:manage')
  async deleteContact(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.settings.removeContact((await this.actor(req, true)).org, id); }
  @Post('campus-image')
  @UseGuards(PermissionGuard) @RequirePermission('society:manage')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 0 } }))
  async uploadImage(@Request() req: any, @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string }) {
    const actor = await this.actor(req, true);
    if (!await this.authorization.hasPermission(req.user.id, 'file:upload', actor.org)) throw new ForbiddenException('File upload permission required');
    return this.settings.uploadCampusImage(actor.org, req.user.id, file);
  }
  @Post('templates/test')
  @UseGuards(PermissionGuard) @RequirePermission('society:manage')
  async testTemplate(@Request() req: any, @Body() dto: TemplateTestDto) {
    const actor = await this.actor(req, true);
    const text = await this.whatsapp.renderTemplate(actor.org, dto.template, { resident_name: 'Sample Resident', visitor_name: 'Sample Visitor', gate_name: 'Main Gate', flat_number: 'Sample Flat', amount: '100.00', due_date: 'Sample due date', notice_title: 'Sample notice', notice_content: 'This is a template preview message.' });
    const result = await this.whatsapp.getProvider().sendMessage(dto.recipientNumber, `[TEST MESSAGE]\n\n${text}`);
    if (!result.success) throw new ServiceUnavailableException(result.error || 'WhatsApp gateway did not accept the test message');
    return { accepted: true, messageId: result.messageId };
  }
}

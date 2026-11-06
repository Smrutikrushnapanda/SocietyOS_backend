import { AuthorizationService } from '../authorization/authorization.service';
import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  Response,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import {
  RequirePermission,
  RequireOrganizationId,
} from '../authorization/require-permission.decorator';
import { FileService } from './file.service';

/**
 * Phase 11 Step 2: PermissionGuard enforces the @RequirePermission metadata
 * against the user's role permissions in the target organization.
 */
@Controller('files')
@UseGuards(AuthGuard, OrganizationGuard, PermissionGuard)
export class FileController {
  constructor(private readonly fileService: FileService, private readonly authorizationService: AuthorizationService) {}

  private async actor(req: any) {
    const membership = await this.authorizationService.getUserRole(req.user.id, req.orgContext.organizationId);
    if (!membership) throw new ForbiddenException('Organization membership required');
    return { id: req.user.id, roles: [membership.role.name] };
  }

  @Post('upload')
  @RequirePermission('file:upload')
  @RequireOrganizationId()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
        files: 1,
        fields: 10,
        fieldSize: 1024 * 1024, // 1 MB
      },
    }),
  )
  async upload(
    @Request() req: any,
    @UploadedFile() file: any,
    @Body() body: any,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('File is required');
    }

    const userId: string = req.user.id;
    const organizationId: string = req.orgContext.organizationId;
    if (body?.purpose === 'DOCUMENT' && !body?.residentId && !body?.resident_id) {
      const actor = await this.actor(req);
      if (!actor.roles.some(role => ['SOCIETY_ADMIN', 'SUPER_ADMIN'].includes(role))) throw new ForbiddenException('Only administrators can upload society and flat vault documents');
    }
    if (body?.purpose === 'PROFILE_PHOTO') {
      const actor = await this.actor(req);
      if (!actor.roles.some(role => ['SOCIETY_ADMIN', 'SUPER_ADMIN'].includes(role)) ||
          !await this.authorizationService.hasPermission(userId, 'resident:manage', organizationId)) throw new ForbiddenException('Resident management permission required');
    }
    return this.fileService.upload(
      organizationId,
      userId,
      file.originalname,
      file.mimetype,
      file.buffer,
      {
        orgContext: req.orgContext,
        actorUserId: userId,
        entityOrganizationId: organizationId,
        request: req,
        purpose: body?.purpose || 'ATTACHMENT',
        documentScope: body?.documentScope || body?.document_scope || 'SOCIETY',
        category: body?.category || 'General',
        buildingId: body?.buildingId || body?.building_id || null,
        floorId: body?.floorId || body?.floor_id || null,
        flatId: body?.flatId || body?.flat_id || null,
        residentId: body?.residentId || body?.resident_id || null,
        status: body?.status || 'ACTIVE',
        description: body?.description || null,
        folderId: body?.folderId || body?.folder_id || null,
      } as any,
    );
  }

  @Get('stats')
  @RequirePermission('file:read')
  @RequireOrganizationId()
  async getStats(@Request() req: any) {
    const userId: string = req.user.id;
    const organizationId: string = req.orgContext.organizationId;
    const roles = (await this.actor(req)).roles;
    return this.fileService.getStats(organizationId, userId, roles);
  }

  @Get()
  @RequirePermission('file:read')
  @RequireOrganizationId()
  async list(
    @Request() req: any,
    @Query('scope') scope?: string,
    @Query('category') category?: string,
    @Query('buildingId') buildingId?: string,
    @Query('floorId') floorId?: string,
    @Query('flatId') flatId?: string,
    @Query('residentId') residentId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('folderId') folderId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const userId: string = req.user.id;
    const organizationId: string = req.orgContext.organizationId;
    const roles = (await this.actor(req)).roles;
    return this.fileService.list(organizationId, userId, roles, {
      scope,
      category,
      buildingId,
      floorId,
      flatId,
      residentId,
      status,
      search,
      folderId,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      sortBy,
      sortOrder,
    });
  }

  @Patch(':id')
  @RequirePermission('file:manage')
  @RequireOrganizationId()
  async updateMetadata(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const userId: string = req.user.id;
    const organizationId: string = req.orgContext.organizationId;
    return this.fileService.updateMetadata(
      id,
      organizationId,
      userId,
      {
        category: body.category,
        description: body.description,
        status: body.status,
        flatId: body.flatId || body.flat_id,
        residentId: body.residentId || body.resident_id,
        buildingId: body.buildingId || body.building_id,
        floorId: body.floorId || body.floor_id,
        folderId: body.folderId || body.folder_id,
      },
      {
        orgContext: req.orgContext,
        actorUserId: userId,
        entityOrganizationId: organizationId,
        request: req,
      },
    );
  }

  @Get(':id')
  @RequirePermission('file:read')
  @RequireOrganizationId()
  async retrieve(
    @Request() req: any,
    @Param('id') id: string,
    @Response() res: any,
  ) {
    const organizationId: string = req.orgContext.organizationId;
    const { buffer, metadata } = await this.fileService.retrieve(
      id,
      organizationId,
      await this.actor(req),
    );

    // Security headers: prevent MIME sniffing and force safe handling
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'private, no-store');
    res.set('Content-Type', metadata.mime_type);

    // Text files and unsafe types are served as attachment to prevent stored XSS execution in browser context
    const dispositionType =
      metadata.mime_type === 'text/plain' ? 'attachment' : 'inline';
    const encodedFilename = encodeURIComponent(metadata.original_filename);
    res.set(
      'Content-Disposition',
      `${dispositionType}; filename="${metadata.original_filename.replace(/"/g, '')}"; filename*=UTF-8''${encodedFilename}`,
    );
    res.send(buffer);
  }

  @Delete(':id')
  @RequirePermission('file:manage')
  @RequireOrganizationId()
  async remove(@Request() req: any, @Param('id') id: string) {
    const userId: string = req.user.id;
    const organizationId: string = req.orgContext.organizationId;
    await this.fileService.remove(id, organizationId, userId, {
      orgContext: req.orgContext,
      actorUserId: userId,
      entityOrganizationId: organizationId,
      request: req,
    });
    return { message: 'File deactivated' };
  }
}

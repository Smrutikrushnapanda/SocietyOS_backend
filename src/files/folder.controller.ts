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
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission, RequireOrganizationId } from '../authorization/require-permission.decorator';
import { FolderService } from './folder.service';

/**
 * Document Repository folder endpoints.
 *
 * Permissions reuse the existing file permissions so no new permission or role
 * is introduced:
 *   - file:read   → list / browse folders
 *   - file:upload → create a folder and move documents into it
 *   - file:manage → rename / delete folders
 */
@Controller('files/folders')
@UseGuards(AuthGuard, OrganizationGuard, PermissionGuard)
export class FolderController {
  constructor(private readonly folderService: FolderService, private readonly authorizationService: AuthorizationService) {}

  private async actorRoles(req: any): Promise<string[]> {
    const membership = await this.authorizationService.getUserRole(req.user.id, req.orgContext.organizationId);
    if (!membership) throw new ForbiddenException('Organization membership required');
    return [membership.role.name];
  }

  @Post()
  @RequirePermission('file:upload')
  @RequireOrganizationId()
  async create(@Request() req: any, @Body() body: any) {
    const userId: string = req.user.id;
    const organizationId: string = req.orgContext.organizationId;
    const roles = await this.actorRoles(req);

    if (!body?.name || !String(body.name).trim()) {
      throw new BadRequestException('Folder name is required');
    }

    return this.folderService.create(
      organizationId,
      userId,
      {
        name: String(body.name),
        description: body.description ?? null,
        folderType: body.folderType || body.folder_type || 'SOCIETY',
        parentId: body.parentId || body.parent_id || null,
        buildingId: body.buildingId || body.building_id || null,
        floorId: body.floorId || body.floor_id || null,
        flatId: body.flatId || body.flat_id || null,
      },
      roles,
      {
        orgContext: req.orgContext,
        actorUserId: userId,
        entityOrganizationId: organizationId,
        request: req,
      },
    );
  }

  @Get()
  @RequirePermission('file:read')
  @RequireOrganizationId()
  async list(
    @Request() req: any,
    @Query('folderType') folderType?: string,
    @Query('parentId') parentId?: string,
    @Query('flatId') flatId?: string,
    @Query('buildingId') buildingId?: string,
    @Query('search') search?: string,
  ) {
    const userId: string = req.user.id;
    const organizationId: string = req.orgContext.organizationId;
    const roles = await this.actorRoles(req);

    const { data, total } = await this.folderService.list(organizationId, userId, roles, {
      folderType,
      parentId,
      flatId,
      buildingId,
      search,
    });

    // Attach document / sub-folder counts so the UI can show real data.
    const counts = await this.folderService.countsFor(
      organizationId,
      data.map((f) => f.id),
      userId,
      roles,
    );

    return {
      data: data.map((folder) => ({
        ...folder,
        document_count: counts[folder.id]?.documentCount ?? 0,
        child_folder_count: counts[folder.id]?.childFolderCount ?? 0,
      })),
      total,
    };
  }

  @Get(':id/breadcrumbs')
  @RequirePermission('file:read')
  @RequireOrganizationId()
  async breadcrumbs(@Request() req: any, @Param('id') id: string) {
    const organizationId: string = req.orgContext.organizationId;
    const userId: string = req.user.id;
    const roles = await this.actorRoles(req);

    const folder = await this.folderService.findAuthorized(
      id,
      organizationId,
      userId,
      roles,
    );

    const chain = await this.folderService.breadcrumbs(id, organizationId);
    return { data: chain, folder };
  }

  @Patch(':id')
  @RequirePermission('file:manage')
  @RequireOrganizationId()
  async rename(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    const userId: string = req.user.id;
    const organizationId: string = req.orgContext.organizationId;
    const roles = await this.actorRoles(req);

    return this.folderService.rename(
      id,
      organizationId,
      userId,
      {
        name: body?.name,
        description: body?.description,
      },
      roles,
      {
        orgContext: req.orgContext,
        actorUserId: userId,
        entityOrganizationId: organizationId,
        request: req,
      },
    );
  }

  @Patch(':id/move')
  @RequirePermission('file:manage')
  @RequireOrganizationId()
  async move(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    const userId: string = req.user.id;
    const organizationId: string = req.orgContext.organizationId;
    const roles = await this.actorRoles(req);

    return this.folderService.move(
      id,
      organizationId,
      userId,
      { parentId: body?.parentId ?? body?.parent_id ?? null },
      roles,
      {
        orgContext: req.orgContext,
        actorUserId: userId,
        entityOrganizationId: organizationId,
        request: req,
      },
    );
  }

  @Delete(':id')
  @RequirePermission('file:manage')
  @RequireOrganizationId()
  async remove(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    const userId: string = req.user.id;
    const organizationId: string = req.orgContext.organizationId;

    const contentHandling =
      body?.contentHandling === 'archive' || body?.contentHandling === 'detach'
        ? body.contentHandling
        : undefined;

    const result = await this.folderService.remove(id, organizationId, userId, {
      contentHandling,
      orgContext: req.orgContext,
      actorUserId: userId,
      entityOrganizationId: organizationId,
      request: req,
    });

    return { message: 'Folder deleted', ...result };
  }
}

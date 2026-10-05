import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  Request,
  Response,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { RequirePermission, RequireOrganizationId } from '../authorization/require-permission.decorator';
import { FileService } from './file.service';

@Controller('files')
@UseGuards(AuthGuard, OrganizationGuard)
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @RequirePermission('file:upload')
  @RequireOrganizationId()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Request() req: any,
    @UploadedFile() file: any,
  ) {
    const userId: string = req.user.id;
    const organizationId: string = req.orgContext.organizationId;
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
    const { buffer, metadata } = await this.fileService.retrieve(id, organizationId);
    res.set('Content-Type', metadata.mime_type);
    res.set('Content-Disposition', `inline; filename="${metadata.original_filename}"`);
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

import {
  Controller,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { ResidentService } from './resident.service';
import { Resident } from '../database/entities/resident.entity';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import {
  RequirePermission,
  RequireOrganizationId,
} from '../authorization/require-permission.decorator';

import { UpdateAppAccessDto } from './dto/resident.dto';

/**
 * Phase 11 Step 2: app-access toggling is a resident:manage operation and is
 * organization-scoped via req.orgContext.
 */
@Controller('residents')
@ApiTags('residents')
@UseGuards(AuthGuard, OrganizationGuard, PermissionGuard)
export class ResidentAppAccessController {
  constructor(private readonly residentService: ResidentService) {}

  @Patch(':residentId/app-access')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Resident })
  @RequirePermission('resident:manage')
  @RequireOrganizationId()
  async updateAppAccess(
    @Request() req: any,
    @Param('residentId') residentId: string,
    @Body() body: UpdateAppAccessDto,
  ) {
    return this.residentService.assignAppAccess(
      residentId,
      body.app_access_status,
      req.orgContext,
    );
  }
}

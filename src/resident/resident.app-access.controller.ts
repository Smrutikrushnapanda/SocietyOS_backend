import {
  Controller,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { ResidentService } from './resident.service';
import { Resident } from '../database/entities/resident.entity';

@Controller('residents')
@ApiTags('residents')
export class ResidentAppAccessController {
  constructor(private readonly residentService: ResidentService) {}

  @Patch(':residentId/app-access')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Resident })
  async updateAppAccess(
    @Param('residentId') residentId: string,
    @Body() body: { app_access_status: boolean },
  ) {
    return this.residentService.assignAppAccess(
      residentId,
      body.app_access_status,
    );
  }
}

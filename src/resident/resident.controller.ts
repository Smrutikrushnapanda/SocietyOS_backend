import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { ResidentService } from './resident.service';
import { Resident } from '../database/entities/resident.entity';

@Controller('residents')
@ApiTags('residents')
export class ResidentController {
  constructor(private readonly residentService: ResidentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, type: Resident })
  async createResident(
    @Body()
    createResidentDto: {
      user_id: string;
      organization_id: string;
      flat_id?: string;
    },
  ) {
    return this.residentService.createResident(createResidentDto);
  }

  @Get()
  @ApiResponse({ status: HttpStatus.OK, type: [Resident] })
  async findAll() {
    return this.residentService.findAll();
  }

  @Get(':id')
  @ApiResponse({ status: HttpStatus.OK, type: Resident })
  async findOne(@Param('id') id: string) {
    return this.residentService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Resident })
  async update(
    @Param('id') id: string,
    @Body()
    updateResidentDto: {
      flat_id?: string;
      kyc_status?: 'PENDING' | 'VERIFIED' | 'REJECTED';
    },
  ) {
    return this.residentService.update(id, updateResidentDto);
  }

  @Patch(':residentId/assign-flat')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Resident })
  async assignFlat(
    @Param('residentId') residentId: string,
    @Body()
    body: {
      flat_id: string;
    },
  ) {
    return this.residentService.assignFlat(residentId, body.flat_id);
  }
}

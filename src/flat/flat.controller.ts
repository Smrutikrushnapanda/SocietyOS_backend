import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { FlatService } from './flat.service';
import { Flat } from '../database/entities/flat.entity';

@Controller('flats')
@ApiTags('flats')
export class FlatController {
  constructor(private readonly flatService: FlatService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, type: Flat })
  async create(
    @Body()
    createFlatDto: {
      organization_id: string;
      building_id: string;
      floor_id: string;
      flat_identifier: string;
      flat_type?: string;
      maintenance_multiplier?: number;
    },
  ) {
    return this.flatService.create(createFlatDto);
  }

  @Get()
  @ApiResponse({ status: HttpStatus.OK, type: [Flat] })
  async findAll() {
    return this.flatService.findAll();
  }

  @Get(':id')
  @ApiResponse({ status: HttpStatus.OK, type: Flat })
  async findOne(@Param('id') id: string) {
    return this.flatService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Flat })
  async update(
    @Param('id') id: string,
    @Body()
    updateFlatDto: {
      flat_identifier?: string;
      flat_type?: string;
      maintenance_multiplier?: number;
      isActive?: boolean;
    },
  ) {
    return this.flatService.update(id, updateFlatDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Flat })
  async remove(@Param('id') id: string) {
    return this.flatService.remove(id);
  }

  @Get('building/:buildingId')
  @ApiResponse({ status: HttpStatus.OK, type: [Flat] })
  async findByBuilding(@Param('buildingId') buildingId: string) {
    return this.flatService.findAllByBuilding(buildingId);
  }
}

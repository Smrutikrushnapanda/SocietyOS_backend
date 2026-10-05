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
import { FloorService } from './floor.service';
import { Floor } from '../database/entities/floor.entity';

@Controller('floors')
@ApiTags('floors')
export class FloorController {
  constructor(private readonly floorService: FloorService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, type: Floor })
  async create(
    @Body()
    createFloorDto: {
      organization_id: string;
      building_id: string;
      floor_number: number;
      name?: string;
    },
  ) {
    return this.floorService.create(createFloorDto);
  }

  @Get()
  @ApiResponse({ status: HttpStatus.OK, type: [Floor] })
  async findAll() {
    return this.floorService.findAll();
  }

  @Get(':id')
  @ApiResponse({ status: HttpStatus.OK, type: Floor })
  async findOne(@Param('id') id: string) {
    return this.floorService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Floor })
  async update(
    @Param('id') id: string,
    @Body()
    updateFloorDto: {
      floor_number?: number;
      name?: string;
      isActive?: boolean;
    },
  ) {
    return this.floorService.update(id, updateFloorDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Floor })
  async remove(@Param('id') id: string) {
    return this.floorService.remove(id);
  }

  @Get('building/:buildingId')
  @ApiResponse({ status: HttpStatus.OK, type: [Floor] })
  async findByBuilding(@Param('buildingId') buildingId: string) {
    return this.floorService.findAllByBuilding(buildingId);
  }
}

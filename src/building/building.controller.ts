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
import { BuildingService } from './building.service';
import { Building } from '../database/entities/building.entity';

@Controller('buildings')
@ApiTags('buildings')
export class BuildingController {
  constructor(private readonly buildingService: BuildingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, type: Building })
  async create(
    @Body()
    createBuildingDto: {
      organization_id: string;
      name: string;
      code?: string;
      totalFloors?: number;
    },
  ) {
    return this.buildingService.create(createBuildingDto);
  }

  @Get()
  @ApiResponse({ status: HttpStatus.OK, type: [Building] })
  async findAll() {
    return this.buildingService.findAll();
  }

  @Get(':id')
  @ApiResponse({ status: HttpStatus.OK, type: Building })
  async findOne(@Param('id') id: string) {
    return this.buildingService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Building })
  async update(
    @Param('id') id: string,
    @Body()
    updateBuildingDto: {
      name?: string;
      code?: string;
      totalFloors?: number;
      isActive?: boolean;
    },
  ) {
    return this.buildingService.update(id, updateBuildingDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Building })
  async remove(@Param('id') id: string) {
    return this.buildingService.remove(id);
  }
}

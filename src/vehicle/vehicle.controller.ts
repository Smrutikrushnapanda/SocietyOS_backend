import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import {
  RequirePermission,
  RequireOrganizationId,
} from '../authorization/require-permission.decorator';
import { VehicleService } from './vehicle.service';
import { Vehicle } from '../database/entities/vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Controller('vehicles')
@ApiTags('vehicles')
@UseGuards(AuthGuard, OrganizationGuard, PermissionGuard)
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Get()
  @ApiResponse({ status: HttpStatus.OK, type: [Vehicle] })
  @RequirePermission('vehicle:read')
  @RequireOrganizationId()
  async findAll(@Request() req: any) {
    return this.vehicleService.findAll(req.orgContext);
  }

  @Get(':id')
  @ApiResponse({ status: HttpStatus.OK, type: Vehicle })
  @RequirePermission('vehicle:read')
  @RequireOrganizationId()
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.vehicleService.findOne(id, req.orgContext);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, type: Vehicle })
  @RequirePermission('vehicle:manage')
  @RequireOrganizationId()
  async create(@Request() req: any, @Body() dto: CreateVehicleDto) {
    return this.vehicleService.create(dto, req.orgContext);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Vehicle })
  @RequirePermission('vehicle:manage')
  @RequireOrganizationId()
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehicleService.update(id, dto, req.orgContext);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Vehicle })
  @RequirePermission('vehicle:manage')
  @RequireOrganizationId()
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.vehicleService.remove(id, req.orgContext);
  }
}

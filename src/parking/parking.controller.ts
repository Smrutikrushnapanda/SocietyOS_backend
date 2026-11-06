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
import { ParkingService } from './parking.service';
import { ParkingSlot } from '../database/entities/parking-slot.entity';
import { CreateParkingSlotDto } from './dto/create-parking-slot.dto';
import { UpdateParkingSlotDto } from './dto/update-parking-slot.dto';

@Controller('parking-slots')
@ApiTags('parking-slots')
@UseGuards(AuthGuard, OrganizationGuard, PermissionGuard)
export class ParkingController {
  constructor(private readonly parkingService: ParkingService) {}

  @Get()
  @ApiResponse({ status: HttpStatus.OK, type: [ParkingSlot] })
  @RequirePermission('parking:read')
  @RequireOrganizationId()
  async findAll(@Request() req: any) {
    return this.parkingService.findAll(req.orgContext);
  }

  @Get(':id')
  @ApiResponse({ status: HttpStatus.OK, type: ParkingSlot })
  @RequirePermission('parking:read')
  @RequireOrganizationId()
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.parkingService.findOne(id, req.orgContext);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, type: ParkingSlot })
  @RequirePermission('parking:manage')
  @RequireOrganizationId()
  async create(@Request() req: any, @Body() dto: CreateParkingSlotDto) {
    return this.parkingService.create(dto, req.orgContext);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: ParkingSlot })
  @RequirePermission('parking:manage')
  @RequireOrganizationId()
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateParkingSlotDto,
  ) {
    return this.parkingService.update(id, dto, req.orgContext);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: ParkingSlot })
  @RequirePermission('parking:manage')
  @RequireOrganizationId()
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.parkingService.remove(id, req.orgContext);
  }
}

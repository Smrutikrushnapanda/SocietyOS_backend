import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { RequireOrganizationId } from '../authorization/require-permission.decorator';
import { VendorsService } from './vendors.service';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';
import { CreateAmcContractDto, UpdateAmcContractDto } from './dto/amc-contract.dto';
import { Vendor } from '../database/entities/vendor.entity';
import { AmcContract } from '../database/entities/amc-contract.entity';

@Controller()
@UseGuards(AuthGuard, OrganizationGuard, PermissionGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  // --- VENDORS ---

  @Get('vendors')
  @RequirePermission('vendor:read')
  @RequireOrganizationId()
  async getVendors(@Request() req: any): Promise<Vendor[]> {
    return this.vendorsService.findAllVendors(req.orgContext);
  }

  @Post('vendors')
  @RequirePermission('vendor:manage')
  @RequireOrganizationId()
  async createVendor(
    @Request() req: any,
    @Body() dto: CreateVendorDto,
  ): Promise<Vendor> {
    return this.vendorsService.createVendor(dto, req.orgContext);
  }

  @Put('vendors/:id')
  @RequirePermission('vendor:manage')
  @RequireOrganizationId()
  async updateVendor(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateVendorDto,
  ): Promise<Vendor> {
    return this.vendorsService.updateVendor(id, dto, req.orgContext);
  }

  @Delete('vendors/:id')
  @RequirePermission('vendor:manage')
  @RequireOrganizationId()
  async deleteVendor(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<{ deleted: boolean }> {
    return this.vendorsService.deleteVendor(id, req.orgContext);
  }

  // --- AMC CONTRACTS ---

  @Get('amc-contracts')
  @RequirePermission('vendor:read')
  @RequireOrganizationId()
  async getContracts(@Request() req: any): Promise<AmcContract[]> {
    return this.vendorsService.findAllContracts(req.orgContext);
  }

  @Post('amc-contracts')
  @RequirePermission('vendor:manage')
  @RequireOrganizationId()
  async createContract(
    @Request() req: any,
    @Body() dto: CreateAmcContractDto,
  ): Promise<AmcContract> {
    return this.vendorsService.createContract(dto, req.orgContext);
  }

  @Put('amc-contracts/:id')
  @RequirePermission('vendor:manage')
  @RequireOrganizationId()
  async updateContract(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateAmcContractDto,
  ): Promise<AmcContract> {
    return this.vendorsService.updateContract(id, dto, req.orgContext);
  }

  @Delete('amc-contracts/:id')
  @RequirePermission('vendor:manage')
  @RequireOrganizationId()
  async deleteContract(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<{ deleted: boolean }> {
    return this.vendorsService.deleteContract(id, req.orgContext);
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { RoleMasterService } from './role-master.service';
import { CreateRoleMasterDto, UpdateRoleMasterDto } from './dto/role-master.dto';
import { RoleMaster } from '../database/entities/role-master.entity';

@ApiTags('role-master')
@ApiBearerAuth()
@Controller('role-master')
@UseGuards(AuthGuard, PermissionGuard)
export class RoleMasterController {
  constructor(private readonly roleMasterService: RoleMasterService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('role_master:manage')
  @ApiOperation({ summary: 'Create a new role master record' })
  @ApiResponse({ status: 201, description: 'Role created successfully', type: RoleMaster })
  async create(@Body() dto: CreateRoleMasterDto): Promise<RoleMaster> {
    return this.roleMasterService.create(dto);
  }

  @Get()
  @RequirePermission('role_master:read')
  @ApiOperation({ summary: 'List all role master records' })
  @ApiResponse({ status: 200, description: 'Role master list', type: [RoleMaster] })
  async findAll(): Promise<RoleMaster[]> {
    return this.roleMasterService.findAll();
  }

  @Get(':id')
  @RequirePermission('role_master:read')
  @ApiOperation({ summary: 'Get a role master record by ID' })
  @ApiResponse({ status: 200, description: 'Role master record', type: RoleMaster })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<RoleMaster> {
    return this.roleMasterService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('role_master:manage')
  @ApiOperation({ summary: 'Update a role master record' })
  @ApiResponse({ status: 200, description: 'Role updated successfully', type: RoleMaster })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleMasterDto,
  ): Promise<RoleMaster> {
    return this.roleMasterService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('role_master:manage')
  @ApiOperation({ summary: 'Delete a role master record' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.roleMasterService.delete(id);
  }
}

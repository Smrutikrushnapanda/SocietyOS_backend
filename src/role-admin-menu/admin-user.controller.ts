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
import { AdminUserService } from './admin-user.service';
import { CreateAdminUserDto, UpdateAdminUserDto } from './dto/admin-user.dto';
import { AdminUser } from '../database/entities/admin-user.entity';

@ApiTags('admin-users')
@ApiBearerAuth()
@Controller('admin-users')
@UseGuards(AuthGuard, PermissionGuard)
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('admin_user:manage')
  @ApiOperation({ summary: 'Create a new admin user account' })
  @ApiResponse({ status: 201, description: 'Admin user created successfully', type: AdminUser })
  async create(@Body() dto: CreateAdminUserDto): Promise<AdminUser> {
    return this.adminUserService.create(dto);
  }

  @Get()
  @RequirePermission('admin_user:read')
  @ApiOperation({ summary: 'List all admin users' })
  @ApiResponse({ status: 200, description: 'List of admin users', type: [AdminUser] })
  async findAll(): Promise<AdminUser[]> {
    return this.adminUserService.findAll();
  }

  @Get(':id')
  @RequirePermission('admin_user:read')
  @ApiOperation({ summary: 'Get an admin user by ID' })
  @ApiResponse({ status: 200, description: 'Admin user details', type: AdminUser })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AdminUser> {
    return this.adminUserService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('admin_user:manage')
  @ApiOperation({ summary: 'Update an admin user' })
  @ApiResponse({ status: 200, description: 'Admin user updated successfully', type: AdminUser })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminUserDto,
  ): Promise<AdminUser> {
    return this.adminUserService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('admin_user:manage')
  @ApiOperation({ summary: 'Delete an admin user' })
  @ApiResponse({ status: 200, description: 'Admin user deleted successfully' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminUserService.delete(id);
  }
}

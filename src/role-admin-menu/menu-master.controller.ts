import { MenuPageDto } from './dto/menu-page.dto';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { MenuMasterService } from './menu-master.service';
import { CreateMenuMasterDto, UpdateMenuMasterDto } from './dto/menu-master.dto';
import { MenuMaster } from '../database/entities/menu-master.entity';

@ApiTags('menu-master')
@ApiBearerAuth()
@Controller('menu-master')
@UseGuards(AuthGuard, PermissionGuard)
export class MenuMasterController {
  constructor(private readonly menuMasterService: MenuMasterService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('menu_master:manage')
  @ApiOperation({ summary: 'Create a new menu master record' })
  @ApiResponse({ status: 201, description: 'Menu created successfully', type: MenuMaster })
  async create(
    @Request() req: any,
    @Body() dto: CreateMenuMasterDto,
  ): Promise<MenuMaster> {
    return this.menuMasterService.create(dto, req.user);
  }

  @Get()
  @RequirePermission('menu_master:read')
  @ApiOperation({ summary: 'List menu items (active by default)' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean, description: 'Set true to include inactive menus' })
  @ApiResponse({ status: 200, description: 'Menu list', type: [MenuMaster] })
  async findAll(@Query('includeInactive') includeInactive?: string): Promise<MenuMaster[]> {
    const shouldInclude = includeInactive === 'true' || includeInactive === '1';
    return this.menuMasterService.findAll(shouldInclude);
  }

  @Get('hierarchy')
  @RequirePermission('menu_master:read')
  @ApiOperation({ summary: 'Get menu items structured as sections/groups with nested children' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Menu hierarchy' })
  async findHierarchy(@Query('includeInactive') includeInactive?: string): Promise<any[]> {
    const shouldInclude = includeInactive === 'true' || includeInactive === '1';
    return this.menuMasterService.findHierarchy(shouldInclude);
  }

  @Get('page')
  @RequirePermission('menu_master:read')
  async findPage(@Query() query: MenuPageDto) {
    return this.menuMasterService.findPage(query.page, query.limit, query.search);
  }

  @Get(':id')
  @RequirePermission('menu_master:read')
  @ApiOperation({ summary: 'Get a menu item by ID' })
  @ApiResponse({ status: 200, description: 'Menu details', type: MenuMaster })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<MenuMaster> {
    return this.menuMasterService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('menu_master:manage')
  @ApiOperation({ summary: 'Update a menu item' })
  @ApiResponse({ status: 200, description: 'Menu updated successfully', type: MenuMaster })
  async update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMenuMasterDto,
  ): Promise<MenuMaster> {
    return this.menuMasterService.update(id, dto, req.user);
  }

  @Delete(':id')
  @RequirePermission('menu_master:manage')
  @ApiOperation({ summary: 'Delete a menu item' })
  @ApiResponse({ status: 200, description: 'Menu deleted successfully' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuMasterService.delete(id);
  }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { MenuMaster } from '../database/entities/menu-master.entity';
import { RoleMaster } from '../database/entities/role-master.entity';
import { AdminUser } from '../database/entities/admin-user.entity';
import { RoleMenu } from '../database/entities/role-menu.entity';
import { CreateMenuMasterDto, UpdateMenuMasterDto } from './dto/menu-master.dto';
import { normalizeWhatsappNumber } from './dto/admin-user.dto';

@Injectable()
export class MenuMasterService {
  private menuRepository: Repository<MenuMaster>;
  private roleRepository: Repository<RoleMaster>;
  private adminUserRepository: Repository<AdminUser>;
  private roleMenuRepository: Repository<RoleMenu>;

  constructor(private readonly dataSource: DataSource) {
    this.menuRepository = this.dataSource.getRepository(MenuMaster);
    this.roleRepository = this.dataSource.getRepository(RoleMaster);
    this.adminUserRepository = this.dataSource.getRepository(AdminUser);
    this.roleMenuRepository = this.dataSource.getRepository(RoleMenu);
  }

  /**
   * Derive the admin_user record associated with the authenticated session.
   */
  private async resolveAuditAdminUser(user?: { id?: string; mobileNumber?: string }): Promise<AdminUser | null> {
    if (!user?.mobileNumber) return null;
    const normalized = normalizeWhatsappNumber(user.mobileNumber);
    return this.adminUserRepository.findOne({
      where: [{ whatsappNumber: normalized }, { whatsappNumber: user.mobileNumber }],
    });
  }

  /**
   * Traverse up the tree from parentId to check if targetId would create a cycle.
   */
  private async wouldCreateCycle(menuId: string, potentialParentId: string): Promise<boolean> {
    if (menuId === potentialParentId) return true;
    let currId: string | null | undefined = potentialParentId;
    const visited = new Set<string>([menuId]);

    while (currId) {
      if (visited.has(currId)) return true;
      visited.add(currId);
      const parent = await this.menuRepository.findOne({ where: { id: currId } });
      currId = parent?.parentId;
    }
    return false;
  }

  async create(dto: CreateMenuMasterDto, authenticatedUser?: any): Promise<MenuMaster> {
    const trimmedPath = dto.menuPath ? dto.menuPath.trim() : null;

    // Check unique menu_path among clickable routes
    if (trimmedPath) {
      const existing = await this.menuRepository.findOne({
        where: { menuPath: trimmedPath },
      });
      if (existing) {
        throw new ConflictException(`Menu item with path "${trimmedPath}" already exists`);
      }
    }

    // Validate parent if provided
    if (dto.parentId) {
      const parent = await this.menuRepository.findOne({ where: { id: dto.parentId } });
      if (!parent) {
        throw new BadRequestException(`Parent menu group with ID "${dto.parentId}" does not exist`);
      }
    }

    // Validate single roleId if provided
    if (dto.roleId) {
      const role = await this.roleRepository.findOne({
        where: { id: dto.roleId },
      });
      if (!role) {
        throw new BadRequestException(`Role with ID "${dto.roleId}" does not exist in role_master`);
      }
    }

    const auditAdmin = await this.resolveAuditAdminUser(authenticatedUser);

    const menu = this.menuRepository.create({
      menuName: dto.menuName.trim(),
      menuPath: trimmedPath,
      iconName: dto.iconName?.trim(),
      description: dto.description?.trim(),
      parentId: dto.parentId || null,
      orderIndex: dto.orderIndex ?? 0,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      roleId: dto.roleId ?? undefined,
      createdById: auditAdmin?.id,
      updatedById: auditAdmin?.id,
    });

    const saved = await this.menuRepository.save(menu);

    // Save multi-role mappings if provided
    const roleIdsToAssign = new Set<string>();
    if (dto.roleId) roleIdsToAssign.add(dto.roleId);
    if (dto.roleIds && Array.isArray(dto.roleIds)) {
      dto.roleIds.forEach((rId) => roleIdsToAssign.add(rId));
    }

    if (roleIdsToAssign.size > 0) {
      for (const rId of roleIdsToAssign) {
        try {
          await this.roleMenuRepository.save(
            this.roleMenuRepository.create({
              menuId: saved.id,
              roleId: rId,
            }),
          );
        } catch {}
      }
    }

    return this.findOne(saved.id);
  }

  async findAll(includeInactive = false): Promise<MenuMaster[]> {
    const where = includeInactive ? {} : { isActive: true };
    return this.menuRepository.find({
      where,
      order: { orderIndex: 'ASC', createdAt: 'ASC' },
      relations: {
        role: true,
        createdBy: true,
        updatedBy: true,
        parent: true,
        children: true,
        roleMenus: { role: true },
      },
    });
  }

  async findPage(page = 1, limit = 10, search = '') {
    if (!Number.isInteger(page) || page < 1 || ![10, 20, 50].includes(limit)) throw new BadRequestException('Invalid pagination');
    const query = this.menuRepository.createQueryBuilder('menu')
      .leftJoinAndSelect('menu.role', 'role').leftJoinAndSelect('menu.parent', 'parent');
    if (search.trim()) query.where('(menu.menuName ILIKE :search OR menu.menuPath ILIKE :search)', { search: `%${search.trim()}%` });
    const total = await query.getCount();
    const totalPages = Math.max(1, Math.ceil(total / limit));
    page = Math.min(page, totalPages);
    const items = await query.orderBy('menu.orderIndex', 'ASC').addOrderBy('menu.createdAt', 'ASC').addOrderBy('menu.id', 'ASC')
      .skip((page - 1) * limit).take(limit).getMany();
    return { items, total, page, limit, totalPages };
  }

  async findHierarchy(includeInactive = false): Promise<any[]> {
    const all = await this.findAll(includeInactive);
    const groups = all.filter((m) => !m.parentId);
    const childrenMap = new Map<string, MenuMaster[]>();

    all.forEach((m) => {
      if (m.parentId) {
        if (!childrenMap.has(m.parentId)) childrenMap.set(m.parentId, []);
        childrenMap.get(m.parentId)!.push(m);
      }
    });

    return groups.map((g) => ({
      ...g,
      children: (childrenMap.get(g.id) || []).sort((a, b) => a.orderIndex - b.orderIndex),
    }));
  }

  async findOne(id: string): Promise<MenuMaster> {
    const menu = await this.menuRepository.findOne({
      where: { id },
      relations: {
        role: true,
        createdBy: true,
        updatedBy: true,
        parent: true,
        children: true,
        roleMenus: { role: true },
      },
    });
    if (!menu) {
      throw new NotFoundException(`Menu with ID "${id}" not found`);
    }
    return menu;
  }

  async update(
    id: string,
    dto: UpdateMenuMasterDto,
    authenticatedUser?: any,
  ): Promise<MenuMaster> {
    const menu = await this.findOne(id);

    if (dto.menuPath !== undefined) {
      const trimmedPath = dto.menuPath ? dto.menuPath.trim() : null;
      if (trimmedPath && trimmedPath !== menu.menuPath) {
        const existing = await this.menuRepository.findOne({
          where: { menuPath: trimmedPath },
        });
        if (existing && existing.id !== id) {
          throw new ConflictException(`Menu item with path "${trimmedPath}" already exists`);
        }
      }
      menu.menuPath = trimmedPath;
    }

    if (dto.parentId !== undefined) {
      if (dto.parentId) {
        if (dto.parentId === id) {
          throw new BadRequestException('A menu item cannot be its own parent');
        }
        const parent = await this.menuRepository.findOne({ where: { id: dto.parentId } });
        if (!parent) {
          throw new BadRequestException(`Parent menu group with ID "${dto.parentId}" does not exist`);
        }
        const isCycle = await this.wouldCreateCycle(id, dto.parentId);
        if (isCycle) {
          throw new BadRequestException('Circular hierarchy detected: a menu cannot be child of its own descendant');
        }
        menu.parentId = dto.parentId;
      } else {
        menu.parentId = null;
      }
    }

    if (dto.roleId !== undefined) {
      if (dto.roleId) {
        const role = await this.roleRepository.findOne({
          where: { id: dto.roleId },
        });
        if (!role) {
          throw new BadRequestException(`Role with ID "${dto.roleId}" does not exist in role_master`);
        }
        menu.roleId = dto.roleId;
      } else {
        menu.roleId = undefined;
      }
    }

    if (dto.menuName !== undefined) menu.menuName = dto.menuName.trim();
    if (dto.iconName !== undefined) menu.iconName = dto.iconName?.trim();
    if (dto.description !== undefined) menu.description = dto.description?.trim();
    if (dto.orderIndex !== undefined) menu.orderIndex = dto.orderIndex;
    if (dto.isActive !== undefined) menu.isActive = dto.isActive;

    const auditAdmin = await this.resolveAuditAdminUser(authenticatedUser);
    if (auditAdmin) {
      menu.updatedById = auditAdmin.id;
    }

    await this.menuRepository.save(menu);

    if (dto.roleIds && Array.isArray(dto.roleIds)) {
      await this.roleMenuRepository.delete({ menuId: id });
      for (const rId of dto.roleIds) {
        try {
          await this.roleMenuRepository.save(
            this.roleMenuRepository.create({ menuId: id, roleId: rId }),
          );
        } catch {}
      }
    }

    return this.findOne(id);
  }

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const menu = await this.findOne(id);

    // Block deletion if group still has child menus
    const childrenCount = await this.menuRepository.count({ where: { parentId: id } });
    if (childrenCount > 0) {
      throw new BadRequestException(
        `Cannot delete menu group "${menu.menuName}". It contains ${childrenCount} child menu item(s). Reassign or delete children first.`,
      );
    }

    await this.roleMenuRepository.delete({ menuId: id });
    await this.menuRepository.delete(id);
    return {
      success: true,
      message: `Menu "${menu.menuName}" deleted successfully`,
    };
  }
}

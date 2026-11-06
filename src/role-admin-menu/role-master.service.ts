import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { RoleMaster } from '../database/entities/role-master.entity';
import { AdminUser } from '../database/entities/admin-user.entity';
import { CreateRoleMasterDto, UpdateRoleMasterDto } from './dto/role-master.dto';

@Injectable()
export class RoleMasterService {
  private roleRepository: Repository<RoleMaster>;
  private adminUserRepository: Repository<AdminUser>;

  constructor(private readonly dataSource: DataSource) {
    this.roleRepository = this.dataSource.getRepository(RoleMaster);
    this.adminUserRepository = this.dataSource.getRepository(AdminUser);
  }

  async create(dto: CreateRoleMasterDto): Promise<RoleMaster> {
    const trimmedName = dto.name.trim();
    const existing = await this.roleRepository.findOne({
      where: { name: trimmedName },
    });
    if (existing) {
      throw new ConflictException(`Role with name "${trimmedName}" already exists`);
    }

    const role = this.roleRepository.create({
      name: trimmedName,
      accessType: dto.accessType.trim(),
    });

    return this.roleRepository.save(role);
  }

  async findAll(): Promise<RoleMaster[]> {
    return this.roleRepository.find({
      order: { createdAt: 'ASC' },
      relations: { adminUsers: true },
    });
  }

  async findOne(id: string): Promise<RoleMaster> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: { adminUsers: true, menus: true },
    });
    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }
    return role;
  }

  async update(id: string, dto: UpdateRoleMasterDto): Promise<RoleMaster> {
    const role = await this.findOne(id);

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (trimmedName.toLowerCase() !== role.name.toLowerCase()) {
        const existing = await this.roleRepository.findOne({
          where: { name: trimmedName },
        });
        if (existing && existing.id !== id) {
          throw new ConflictException(`Role with name "${trimmedName}" already exists`);
        }
      }
      role.name = trimmedName;
    }

    if (dto.accessType !== undefined) {
      role.accessType = dto.accessType.trim();
    }

    return this.roleRepository.save(role);
  }

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const role = await this.findOne(id);

    // Prevent deletion of roles currently assigned to admin users
    const userCount = await this.adminUserRepository.count({
      where: { roleId: id },
    });
    if (userCount > 0) {
      throw new BadRequestException(
        `Cannot delete role "${role.name}" because it is currently assigned to ${userCount} admin user(s)`,
      );
    }

    await this.roleRepository.delete(id);
    return {
      success: true,
      message: `Role "${role.name}" deleted successfully`,
    };
  }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AdminUser } from '../database/entities/admin-user.entity';
import { RoleMaster } from '../database/entities/role-master.entity';
import {
  CreateAdminUserDto,
  UpdateAdminUserDto,
  normalizeEmail,
  normalizeWhatsappNumber,
} from './dto/admin-user.dto';

@Injectable()
export class AdminUserService {
  private adminUserRepository: Repository<AdminUser>;
  private roleRepository: Repository<RoleMaster>;

  constructor(private readonly dataSource: DataSource) {
    this.adminUserRepository = this.dataSource.getRepository(AdminUser);
    this.roleRepository = this.dataSource.getRepository(RoleMaster);
  }

  async create(dto: CreateAdminUserDto): Promise<AdminUser> {
    const normalizedMail = normalizeEmail(dto.email);
    const normalizedPhone = normalizeWhatsappNumber(dto.whatsappNumber);

    // Verify role exists and strictly enforce SOCIETY_ADMIN restriction
    const role = await this.roleRepository.findOne({
      where: { id: dto.roleId },
    });
    if (!role) {
      throw new BadRequestException(`Role with ID "${dto.roleId}" does not exist in role_master`);
    }

    if (role.name !== 'SOCIETY_ADMIN') {
      throw new BadRequestException(
        `Invalid role: Admin accounts can only be provisioned with the SOCIETY_ADMIN role. Role "${role.name}" is not permitted.`,
      );
    }

    // Check unique email
    const existingEmail = await this.adminUserRepository.findOne({
      where: { email: normalizedMail },
    });
    if (existingEmail) {
      throw new ConflictException(`Admin user with email "${normalizedMail}" already exists`);
    }

    // Check unique WhatsApp number
    const existingPhone = await this.adminUserRepository.findOne({
      where: { whatsappNumber: normalizedPhone },
    });
    if (existingPhone) {
      throw new ConflictException(
        `Admin user with WhatsApp number "${normalizedPhone}" already exists`,
      );
    }

    const adminUser = this.adminUserRepository.create({
      fullName: dto.fullName.trim(),
      email: normalizedMail,
      whatsappNumber: normalizedPhone,
      roleId: dto.roleId,
    });

    const saved = await this.adminUserRepository.save(adminUser);
    return this.findOne(saved.id);
  }

  async findAll(): Promise<AdminUser[]> {
    return this.adminUserRepository.find({
      order: { createdAt: 'DESC' },
      relations: { role: true },
    });
  }

  async findOne(id: string): Promise<AdminUser> {
    const adminUser = await this.adminUserRepository.findOne({
      where: { id },
      relations: { role: true },
    });
    if (!adminUser) {
      throw new NotFoundException(`Admin user with ID "${id}" not found`);
    }
    return adminUser;
  }

  async update(id: string, dto: UpdateAdminUserDto): Promise<AdminUser> {
    const adminUser = await this.findOne(id);

    if (dto.roleId !== undefined && dto.roleId !== adminUser.roleId) {
      const role = await this.roleRepository.findOne({
        where: { id: dto.roleId },
      });
      if (!role) {
        throw new BadRequestException(`Role with ID "${dto.roleId}" does not exist in role_master`);
      }
      if (role.name !== 'SOCIETY_ADMIN') {
        throw new BadRequestException(
          `Invalid role: Admin accounts can only be provisioned with the SOCIETY_ADMIN role. Role "${role.name}" is not permitted.`,
        );
      }
      adminUser.roleId = dto.roleId;
    }

    if (dto.email !== undefined) {
      const normalizedMail = normalizeEmail(dto.email);
      if (normalizedMail !== adminUser.email) {
        const existingEmail = await this.adminUserRepository.findOne({
          where: { email: normalizedMail },
        });
        if (existingEmail && existingEmail.id !== id) {
          throw new ConflictException(`Admin user with email "${normalizedMail}" already exists`);
        }
        adminUser.email = normalizedMail;
      }
    }

    if (dto.whatsappNumber !== undefined) {
      const normalizedPhone = normalizeWhatsappNumber(dto.whatsappNumber);
      if (normalizedPhone !== adminUser.whatsappNumber) {
        const existingPhone = await this.adminUserRepository.findOne({
          where: { whatsappNumber: normalizedPhone },
        });
        if (existingPhone && existingPhone.id !== id) {
          throw new ConflictException(
            `Admin user with WhatsApp number "${normalizedPhone}" already exists`,
          );
        }
        adminUser.whatsappNumber = normalizedPhone;
      }
    }

    if (dto.fullName !== undefined) {
      adminUser.fullName = dto.fullName.trim();
    }

    await this.adminUserRepository.save(adminUser);
    return this.findOne(id);
  }

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const adminUser = await this.findOne(id);
    await this.adminUserRepository.delete(id);
    return {
      success: true,
      message: `Admin user "${adminUser.fullName}" deleted successfully`,
    };
  }
}

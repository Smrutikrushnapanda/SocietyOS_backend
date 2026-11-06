import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { Organization } from '../database/entities/organization.entity';
import { FileMetadata } from '../database/entities/file-metadata.entity';
import { FileService } from '../files/file.service';
import { mergeMasterSettings, type MasterSettings, type EmergencyContact } from './settings.model';
import { BrandingSettingsDto, EmergencyContactDto, ProfileSettingsDto, TemplateSettingsDto } from './settings.dto';
import { validateMessageTemplates } from '../whatsapp/whatsapp-template.service';

@Injectable()
export class SocietySettingsService {
  constructor(private readonly source: DataSource, private readonly files: FileService) {}
  async read(organizationId: string) {
    const organization = await this.source.getRepository(Organization).findOne({ where: { id: organizationId, isActive: true }, select: { id: true, name: true, address: true, master_settings: true } });
    if (!organization) throw new NotFoundException('Society not found');
    return { organizationId, name: organization.name, address: organization.address || '', ...mergeMasterSettings(organization.master_settings) };
  }
  private async change(organizationId: string, mutate: (settings: MasterSettings, organization: Organization) => void) {
    return this.source.transaction(async manager => {
      const repo = manager.getRepository(Organization);
      const organization = await repo.findOne({ where: { id: organizationId, isActive: true }, select: { id: true, name: true, address: true, master_settings: true }, lock: { mode: 'pessimistic_write' } });
      if (!organization) throw new NotFoundException('Society not found');
      const settings = mergeMasterSettings(organization.master_settings);
      mutate(settings, organization);
      organization.master_settings = mergeMasterSettings(settings);
      organization.updatedAt = new Date();
      await repo.save(organization);
      return { organizationId, name: organization.name, address: organization.address || '', ...organization.master_settings };
    });
  }
  profile(organizationId: string, dto: ProfileSettingsDto) {
    if (!dto.name.trim()) throw new BadRequestException('Society name is required');
    return this.change(organizationId, (settings, organization) => {
      organization.name = dto.name.trim(); organization.address = dto.address.trim();
      settings.profile = { registrationNumber: dto.registrationNumber.trim(), currencyCode: dto.currencyCode };
    });
  }
  async branding(organizationId: string, dto: BrandingSettingsDto) {
    if (dto.campusImageFileId) {
      const image = await this.source.getRepository(FileMetadata).findOne({ where: { id: dto.campusImageFileId, organization_id: organizationId, is_active: true } });
      if (!image || image.category !== 'Society Campus Banner' || image.purpose !== 'ATTACHMENT') throw new ForbiddenException('Campus image not found or access denied');
    }
    return this.change(organizationId, settings => {
      const branding = { ...settings.branding, ...dto, officeEmail: dto.officeEmail || '', officeHours: dto.officeHours ?? settings.branding.officeHours, campusImageFileId: dto.campusImageFileId ?? null };
      if (Boolean(branding.officeOpenTime) !== Boolean(branding.officeCloseTime)) throw new BadRequestException('Set both opening and closing times');
      settings.branding = branding;
    });
  }
  templates(organizationId: string, dto: TemplateSettingsDto) {
    validateMessageTemplates(dto);
    return this.change(organizationId, settings => { settings.templates = { ...dto }; });
  }
  contact(organizationId: string, dto: EmergencyContactDto, id?: string) {
    if (!dto.name.trim()) throw new BadRequestException('Contact name is required');
    return this.change(organizationId, settings => {
      const contact: EmergencyContact = { ...dto, name: dto.name.trim(), phone: dto.phone.trim(), description: dto.description.trim(), id: id ?? randomUUID() };
      if (id) {
        const index = settings.emergencyContacts.findIndex(item => item.id === id);
        if (index < 0) throw new NotFoundException('Emergency contact not found');
        settings.emergencyContacts[index] = contact;
      } else {
        if (settings.emergencyContacts.length >= 500) throw new BadRequestException('Maximum 500 emergency contacts');
        settings.emergencyContacts.push(contact);
      }
    });
  }
  removeContact(organizationId: string, id: string) {
    return this.change(organizationId, settings => {
      if (!settings.emergencyContacts.some(contact => contact.id === id)) throw new NotFoundException('Emergency contact not found');
      settings.emergencyContacts = settings.emergencyContacts.filter(contact => contact.id !== id);
    });
  }
  async uploadCampusImage(organizationId: string, userId: string, file: { buffer: Buffer; originalname: string; mimetype: string }) {
    if (!file?.buffer || !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype) || file.buffer.length > 2 * 1024 * 1024) throw new BadRequestException('Choose a JPG, PNG or WebP image up to 2 MB');
    try {
      const info = await sharp(file.buffer, { limitInputPixels: 40000000 }).metadata();
      const width = [5, 6, 7, 8].includes(info.orientation ?? 1) ? info.height : info.width;
      const height = [5, 6, 7, 8].includes(info.orientation ?? 1) ? info.width : info.height;
      if (!width || !height || width <= height || (info.pages ?? 1) > 1) throw new Error();
    } catch { throw new BadRequestException('Campus image must be a valid, non-animated horizontal image (width greater than height)'); }
    return this.files.upload(organizationId, userId, file.originalname, file.mimetype, file.buffer, { purpose: 'ATTACHMENT', category: 'Society Campus Banner', documentScope: 'SOCIETY' } as never);
  }
}

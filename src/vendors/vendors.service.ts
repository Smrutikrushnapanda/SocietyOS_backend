import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { Vendor } from '../database/entities/vendor.entity';
import { AmcContract } from '../database/entities/amc-contract.entity';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';
import { CreateAmcContractDto, UpdateAmcContractDto } from './dto/amc-contract.dto';

@Injectable()
export class VendorsService {
  constructor(private readonly dataSource: DataSource) {}

  private resolveOrgId(orgContext: any): string {
    const orgId =
      orgContext?.targetOrganizationId ??
      orgContext?.organizationId ??
      orgContext?.organization_id;
    if (!orgId) {
      throw new ForbiddenException('Organization context is required');
    }
    return orgId;
  }

  // --- VENDORS ---

  async findAllVendors(orgContext: any): Promise<Vendor[]> {
    const orgId = this.resolveOrgId(orgContext);
    const repo = this.dataSource.getRepository(Vendor);
    let items = await repo.find({
      where: { organization_id: orgId },
      order: { created_at: 'ASC' },
    });

    if (items.length === 0) {
      const defaults = [
        {
          id: randomUUID(),
          organization_id: orgId,
          name: 'Otis Elevator AMC',
          service_category: 'Lift & Elevator',
          contact_person: 'Rajesh Nair',
          phone: '+91 98210 11223',
          email: 'rajesh.nair@otis.example.com',
          sla: '2 Hours 24x7',
          status: 'Active',
          notes: 'Emergency elevator helpline and bi-monthly maintenance',
        },
        {
          id: randomUUID(),
          organization_id: orgId,
          name: 'Kirloskar DG AMC',
          service_category: 'Backup Generators',
          contact_person: 'Anil Salve',
          phone: '+91 98330 44556',
          email: 'service@kirloskar.example.com',
          sla: '4 Hours',
          status: 'Active',
          notes: 'Diesel generator servicing and filter replacements',
        },
        {
          id: randomUUID(),
          organization_id: orgId,
          name: 'AquaFlow Plumbing Care',
          service_category: 'Plumbing & Drainage',
          contact_person: 'Suresh Kumar',
          phone: '+91 98190 77889',
          email: 'aquaflow@example.com',
          sla: '1 Hour',
          status: 'Active',
          notes: 'Main riser lines, STP maintenance and pressure pumps',
        },
        {
          id: randomUUID(),
          organization_id: orgId,
          name: 'SecureForce Security Services',
          service_category: 'Manned Security',
          contact_person: 'Capt. Deshmukh',
          phone: '+91 98201 99001',
          email: 'ops@secureforce.example.com',
          sla: 'Instant',
          status: 'Active',
          notes: '24/7 security guard deployments and barrier operations',
        },
      ];

      await repo.save(defaults);
      items = await repo.find({
        where: { organization_id: orgId },
        order: { created_at: 'ASC' },
      });
    }

    return items;
  }

  async createVendor(dto: CreateVendorDto, orgContext: any): Promise<Vendor> {
    const orgId = this.resolveOrgId(orgContext);
    const repo = this.dataSource.getRepository(Vendor);

    const vendor = repo.create({
      id: randomUUID(),
      organization_id: orgId,
      name: dto.name,
      service_category: dto.service_category,
      contact_person: dto.contact_person,
      phone: dto.phone,
      email: dto.email || null,
      sla: dto.sla || '24 Hours',
      status: dto.status || 'Active',
      notes: dto.notes || null,
    });

    return repo.save(vendor);
  }

  async updateVendor(id: string, dto: UpdateVendorDto, orgContext: any): Promise<Vendor> {
    const orgId = this.resolveOrgId(orgContext);
    const repo = this.dataSource.getRepository(Vendor);

    const vendor = await repo.findOne({ where: { id, organization_id: orgId } });
    if (!vendor) {
      throw new NotFoundException('Vendor not found or access denied');
    }

    if (dto.name !== undefined) vendor.name = dto.name;
    if (dto.service_category !== undefined) vendor.service_category = dto.service_category;
    if (dto.contact_person !== undefined) vendor.contact_person = dto.contact_person;
    if (dto.phone !== undefined) vendor.phone = dto.phone;
    if (dto.email !== undefined) vendor.email = dto.email;
    if (dto.sla !== undefined) vendor.sla = dto.sla;
    if (dto.status !== undefined) vendor.status = dto.status;
    if (dto.notes !== undefined) vendor.notes = dto.notes;
    vendor.updated_at = new Date();

    return repo.save(vendor);
  }

  async deleteVendor(id: string, orgContext: any): Promise<{ deleted: boolean }> {
    const orgId = this.resolveOrgId(orgContext);
    const repo = this.dataSource.getRepository(Vendor);

    const vendor = await repo.findOne({ where: { id, organization_id: orgId } });
    if (!vendor) {
      throw new NotFoundException('Vendor not found or access denied');
    }

    // Check if contract depends on this vendor
    const contractsCount = await this.dataSource.getRepository(AmcContract).count({
      where: { vendor_id: id, organization_id: orgId },
    });
    if (contractsCount > 0) {
      throw new BadRequestException('Cannot delete vendor with existing AMC contracts. Delete or reassign contracts first.');
    }

    await repo.remove(vendor);
    return { deleted: true };
  }

  // --- AMC CONTRACTS ---

  async findAllContracts(orgContext: any): Promise<AmcContract[]> {
    const orgId = this.resolveOrgId(orgContext);
    const repo = this.dataSource.getRepository(AmcContract);
    let items = await repo.find({
      where: { organization_id: orgId },
      relations: { vendor: true },
      order: { created_at: 'DESC' },
    });

    if (items.length === 0) {
      // Ensure default vendors exist
      const vendors = await this.findAllVendors(orgContext);
      if (vendors.length > 0) {
        const defaults = [
          {
            id: randomUUID(),
            organization_id: orgId,
            vendor_id: vendors[0].id,
            contract_name: 'Annual Passenger Elevator Comprehensive Maintenance',
            contract_type: 'Comprehensive',
            start_date: '2026-01-01',
            end_date: '2026-12-31',
            amount: 240000,
            status: 'Active',
            service_coverage: 'Covers all 4 passenger lifts across Wings A & B. 24x7 breakdown response.',
            renewal_notes: 'Renewal proposal due by November 2026.',
          },
          {
            id: randomUUID(),
            organization_id: orgId,
            vendor_id: vendors[1]?.id || vendors[0].id,
            contract_name: 'Backup Generator Semi-Annual Servicing & Overhaul',
            contract_type: 'Non-Comprehensive',
            start_date: '2026-04-01',
            end_date: '2027-03-31',
            amount: 120000,
            status: 'Active',
            service_coverage: 'Bi-monthly inspections and filter changes. Consumables billed separately.',
            renewal_notes: 'Annual rate lock guaranteed.',
          },
        ];

        await repo.save(defaults);
        items = await repo.find({
          where: { organization_id: orgId },
          relations: { vendor: true },
          order: { created_at: 'DESC' },
        });
      }
    }

    return items;
  }

  async createContract(dto: CreateAmcContractDto, orgContext: any): Promise<AmcContract> {
    const orgId = this.resolveOrgId(orgContext);

    // Validate vendor exists and belongs to the SAME organization
    const vendor = await this.dataSource.getRepository(Vendor).findOne({
      where: { id: dto.vendor_id, organization_id: orgId },
    });
    if (!vendor) {
      throw new ForbiddenException('Invalid vendor or cross-organization vendor reference is forbidden');
    }

    // Validate dates
    if (new Date(dto.end_date) < new Date(dto.start_date)) {
      throw new BadRequestException('Contract end date cannot be earlier than start date');
    }

    const repo = this.dataSource.getRepository(AmcContract);
    const contract = repo.create({
      id: randomUUID(),
      organization_id: orgId,
      vendor_id: dto.vendor_id,
      contract_name: dto.contract_name,
      contract_type: dto.contract_type || 'Comprehensive',
      start_date: dto.start_date,
      end_date: dto.end_date,
      amount: dto.amount ?? 0,
      status: dto.status || 'Active',
      service_coverage: dto.service_coverage || null,
      renewal_notes: dto.renewal_notes || null,
    });

    const saved = await repo.save(contract);
    return repo.findOne({ where: { id: saved.id }, relations: { vendor: true } }) as Promise<AmcContract>;
  }

  async updateContract(id: string, dto: UpdateAmcContractDto, orgContext: any): Promise<AmcContract> {
    const orgId = this.resolveOrgId(orgContext);
    const repo = this.dataSource.getRepository(AmcContract);

    const contract = await repo.findOne({ where: { id, organization_id: orgId } });
    if (!contract) {
      throw new NotFoundException('AMC contract not found or access denied');
    }

    if (dto.vendor_id) {
      const vendor = await this.dataSource.getRepository(Vendor).findOne({
        where: { id: dto.vendor_id, organization_id: orgId },
      });
      if (!vendor) {
        throw new ForbiddenException('Invalid vendor or cross-organization vendor reference is forbidden');
      }
      contract.vendor_id = dto.vendor_id;
    }

    const start = dto.start_date ?? contract.start_date;
    const end = dto.end_date ?? contract.end_date;
    if (new Date(end) < new Date(start)) {
      throw new BadRequestException('Contract end date cannot be earlier than start date');
    }

    if (dto.contract_name !== undefined) contract.contract_name = dto.contract_name;
    if (dto.contract_type !== undefined) contract.contract_type = dto.contract_type;
    if (dto.start_date !== undefined) contract.start_date = dto.start_date;
    if (dto.end_date !== undefined) contract.end_date = dto.end_date;
    if (dto.amount !== undefined) contract.amount = dto.amount;
    if (dto.status !== undefined) contract.status = dto.status;
    if (dto.service_coverage !== undefined) contract.service_coverage = dto.service_coverage;
    if (dto.renewal_notes !== undefined) contract.renewal_notes = dto.renewal_notes;
    contract.updated_at = new Date();

    await repo.save(contract);
    return repo.findOne({ where: { id: contract.id }, relations: { vendor: true } }) as Promise<AmcContract>;
  }

  async deleteContract(id: string, orgContext: any): Promise<{ deleted: boolean }> {
    const orgId = this.resolveOrgId(orgContext);
    const repo = this.dataSource.getRepository(AmcContract);

    const contract = await repo.findOne({ where: { id, organization_id: orgId } });
    if (!contract) {
      throw new NotFoundException('AMC contract not found or access denied');
    }

    await repo.remove(contract);
    return { deleted: true };
  }
}

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { Vehicle } from '../database/entities/vehicle.entity';
import { Resident } from '../database/entities/resident.entity';
import { Flat } from '../database/entities/flat.entity';
import { ParkingSlot } from '../database/entities/parking-slot.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { OrganizationContext } from '../organization/organization-context.service';

@Injectable()
export class VehicleService {
  constructor(private readonly dataSource: DataSource) {}

  private get vehicleRepository() {
    return this.dataSource.getRepository(Vehicle);
  }

  private get residentRepository() {
    return this.dataSource.getRepository(Resident);
  }

  private get flatRepository() {
    return this.dataSource.getRepository(Flat);
  }

  private resolveOrgId(orgContext: OrganizationContext): string {
    const orgId = orgContext.isSuperAdmin
      ? orgContext.targetOrganizationId
      : orgContext.organizationId;
    if (!orgId) {
      throw new ForbiddenException('Organization context is required');
    }
    return orgId;
  }

  async findAll(orgContext: OrganizationContext): Promise<Vehicle[]> {
    const orgId = this.resolveOrgId(orgContext);
    return this.vehicleRepository.find({
      where: { organization_id: orgId, is_active: true },
      relations: { resident: { user: true }, flat: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, orgContext: OrganizationContext): Promise<Vehicle> {
    const orgId = this.resolveOrgId(orgContext);
    const vehicle = await this.vehicleRepository.findOne({
      where: { id, organization_id: orgId },
      relations: { resident: { user: true }, flat: true },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }
    return vehicle;
  }

  async create(
    dto: CreateVehicleDto,
    orgContext: OrganizationContext,
  ): Promise<Vehicle> {
    const orgId = this.resolveOrgId(orgContext);

    // Validate resident belongs to the organization
    const resident = await this.residentRepository.findOneBy({
      id: dto.resident_id,
      organization_id: orgId,
    });
    if (!resident) {
      throw new NotFoundException(
        'Resident not found or does not belong to active organization',
      );
    }

    // Validate flat if provided and reconcile
    if (dto.flat_id) {
      const flat = await this.flatRepository.findOneBy({
        id: dto.flat_id,
        organization_id: orgId,
      });
      if (!flat) {
        throw new NotFoundException(
          'Flat unit not found or does not belong to active organization',
        );
      }
      if (resident.flat_id && resident.flat_id !== dto.flat_id) {
        throw new BadRequestException(
          'Selected resident is associated with a different flat',
        );
      }
    }

    const normalizedReg = dto.registration_number.toUpperCase().trim();

    // Prevent duplicate registrations within the same organization
    const existing = await this.vehicleRepository.findOneBy({
      organization_id: orgId,
      registration_number: normalizedReg,
      is_active: true,
    });
    if (existing) {
      throw new ConflictException(
        `Vehicle with registration number ${normalizedReg} is already registered in this organization`,
      );
    }

    let vType = dto.vehicle_type || '4W';
    if (vType === 'FOUR_WHEELER') vType = '4W';
    if (vType === 'TWO_WHEELER') vType = '2W';

    const vehicle = this.vehicleRepository.create({
      id: randomUUID(),
      organization_id: orgId,
      resident_id: dto.resident_id,
      flat_id: dto.flat_id || resident.flat_id || null,
      registration_number: normalizedReg,
      vehicle_type: vType,
      make_model: dto.make_model || null,
      color: dto.color || null,
      rfid_tag: dto.rfid_tag || null,
      is_active: true,
    });

    const saved = await this.vehicleRepository.save(vehicle);

    if (dto.parking_slot_id) {
      const slotRepo = this.dataSource.getRepository(ParkingSlot);
      const slot = await slotRepo.findOneBy({
        id: dto.parking_slot_id,
        organization_id: orgId,
      });
      if (slot) {
        slot.vehicle_id = saved.id;
        slot.resident_id = saved.resident_id;
        slot.flat_id = saved.flat_id;
        slot.status = 'OCCUPIED';
        await slotRepo.save(slot);
      }
    }

    return this.findOne(saved.id, orgContext);
  }

  async update(
    id: string,
    dto: UpdateVehicleDto,
    orgContext: OrganizationContext,
  ): Promise<Vehicle> {
    const vehicle = await this.findOne(id, orgContext);
    const orgId = vehicle.organization_id;

    let targetResidentId = vehicle.resident_id;
    if (dto.resident_id && dto.resident_id !== vehicle.resident_id) {
      const resident = await this.residentRepository.findOneBy({
        id: dto.resident_id,
        organization_id: orgId,
      });
      if (!resident) {
        throw new NotFoundException(
          'Resident not found in active organization',
        );
      }
      targetResidentId = dto.resident_id;
      vehicle.resident_id = dto.resident_id;
    }

    if (dto.flat_id !== undefined) {
      if (dto.flat_id) {
        const flat = await this.flatRepository.findOneBy({
          id: dto.flat_id,
          organization_id: orgId,
        });
        if (!flat) {
          throw new NotFoundException('Flat not found in active organization');
        }
        const res = await this.residentRepository.findOneBy({
          id: targetResidentId,
          organization_id: orgId,
        });
        if (res?.flat_id && res.flat_id !== dto.flat_id) {
          throw new BadRequestException('Selected resident is associated with a different flat');
        }
      }
      vehicle.flat_id = dto.flat_id || null;
    }

    if (dto.registration_number !== undefined) {
      const normalizedReg = dto.registration_number.toUpperCase().trim();
      const existing = await this.vehicleRepository.findOneBy({
        organization_id: orgId,
        registration_number: normalizedReg,
        is_active: true,
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Vehicle with registration number ${normalizedReg} is already registered in this organization`,
        );
      }
      vehicle.registration_number = normalizedReg;
    }

    if (dto.vehicle_type !== undefined) {
      let vType = dto.vehicle_type;
      if (vType === 'FOUR_WHEELER') vType = '4W';
      if (vType === 'TWO_WHEELER') vType = '2W';
      vehicle.vehicle_type = vType;
    }
    if (dto.make_model !== undefined) {
      vehicle.make_model = dto.make_model || null;
    }
    if (dto.color !== undefined) {
      vehicle.color = dto.color || null;
    }
    if (dto.rfid_tag !== undefined) {
      vehicle.rfid_tag = dto.rfid_tag || null;
    }
    if (dto.is_active !== undefined) {
      vehicle.is_active = dto.is_active;
    }

    await this.vehicleRepository.save(vehicle);

    if (dto.parking_slot_id) {
      const slotRepo = this.dataSource.getRepository(ParkingSlot);
      const slot = await slotRepo.findOneBy({
        id: dto.parking_slot_id,
        organization_id: orgId,
      });
      if (slot) {
        slot.vehicle_id = vehicle.id;
        slot.resident_id = vehicle.resident_id;
        slot.flat_id = vehicle.flat_id;
        slot.status = 'OCCUPIED';
        await slotRepo.save(slot);
      }
    }

    return this.findOne(id, orgContext);
  }

  async remove(id: string, orgContext: OrganizationContext): Promise<Vehicle> {
    const vehicle = await this.findOne(id, orgContext);
    vehicle.is_active = false;
    await this.vehicleRepository.save(vehicle);
    return vehicle;
  }
}

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { ParkingSlot } from '../database/entities/parking-slot.entity';
import { Flat } from '../database/entities/flat.entity';
import { Resident } from '../database/entities/resident.entity';
import { Vehicle } from '../database/entities/vehicle.entity';
import { CreateParkingSlotDto } from './dto/create-parking-slot.dto';
import { UpdateParkingSlotDto } from './dto/update-parking-slot.dto';
import { OrganizationContext } from '../organization/organization-context.service';

@Injectable()
export class ParkingService {
  constructor(private readonly dataSource: DataSource) {}

  private get parkingRepository() {
    return this.dataSource.getRepository(ParkingSlot);
  }

  private get flatRepository() {
    return this.dataSource.getRepository(Flat);
  }

  private get residentRepository() {
    return this.dataSource.getRepository(Resident);
  }

  private get vehicleRepository() {
    return this.dataSource.getRepository(Vehicle);
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

  async findAll(orgContext: OrganizationContext): Promise<ParkingSlot[]> {
    const orgId = this.resolveOrgId(orgContext);
    return this.parkingRepository.find({
      where: { organization_id: orgId },
      relations: { flat: true, resident: { user: true }, vehicle: true },
      order: { zone: 'ASC', slot_number: 'ASC' },
    });
  }

  async findOne(
    id: string,
    orgContext: OrganizationContext,
  ): Promise<ParkingSlot> {
    const orgId = this.resolveOrgId(orgContext);
    const slot = await this.parkingRepository.findOne({
      where: { id, organization_id: orgId },
      relations: { flat: true, resident: { user: true }, vehicle: true },
    });
    if (!slot) {
      throw new NotFoundException(`Parking slot with ID ${id} not found`);
    }
    return slot;
  }

  async create(
    dto: CreateParkingSlotDto,
    orgContext: OrganizationContext,
  ): Promise<ParkingSlot> {
    const orgId = this.resolveOrgId(orgContext);

    if (dto.flat_id) {
      const flat = await this.flatRepository.findOneBy({
        id: dto.flat_id,
        organization_id: orgId,
      });
      if (!flat) {
        throw new NotFoundException('Flat not found in active organization');
      }
    }

    if (dto.resident_id) {
      const resident = await this.residentRepository.findOneBy({
        id: dto.resident_id,
        organization_id: orgId,
      });
      if (!resident) {
        throw new NotFoundException(
          'Resident not found in active organization',
        );
      }
    }

    if (dto.vehicle_id) {
      const vehicle = await this.vehicleRepository.findOneBy({
        id: dto.vehicle_id,
        organization_id: orgId,
      });
      if (!vehicle) {
        throw new NotFoundException('Vehicle not found in active organization');
      }
    }

    let status = dto.status || 'AVAILABLE';
    if (!dto.status && (dto.flat_id || dto.resident_id || dto.vehicle_id)) {
      status = 'OCCUPIED';
    }

    const slot = this.parkingRepository.create({
      id: randomUUID(),
      organization_id: orgId,
      slot_number: dto.slot_number.toUpperCase().trim(),
      zone: dto.zone || 'A',
      slot_type: dto.slot_type || '4W',
      status,
      flat_id: dto.flat_id || null,
      resident_id: dto.resident_id || null,
      vehicle_id: dto.vehicle_id || null,
    });

    const saved = await this.parkingRepository.save(slot);
    return this.findOne(saved.id, orgContext);
  }

  async update(
    id: string,
    dto: UpdateParkingSlotDto,
    orgContext: OrganizationContext,
  ): Promise<ParkingSlot> {
    const slot = await this.findOne(id, orgContext);
    const orgId = slot.organization_id;

    if (dto.flat_id !== undefined) {
      if (dto.flat_id) {
        const flat = await this.flatRepository.findOneBy({
          id: dto.flat_id,
          organization_id: orgId,
        });
        if (!flat) {
          throw new NotFoundException('Flat not found in active organization');
        }
      }
      slot.flat_id = dto.flat_id || null;
    }

    if (dto.resident_id !== undefined) {
      if (dto.resident_id) {
        const resident = await this.residentRepository.findOneBy({
          id: dto.resident_id,
          organization_id: orgId,
        });
        if (!resident) {
          throw new NotFoundException(
            'Resident not found in active organization',
          );
        }
      }
      slot.resident_id = dto.resident_id || null;
    }

    if (dto.vehicle_id !== undefined) {
      if (dto.vehicle_id) {
        const vehicle = await this.vehicleRepository.findOneBy({
          id: dto.vehicle_id,
          organization_id: orgId,
        });
        if (!vehicle) {
          throw new NotFoundException(
            'Vehicle not found in active organization',
          );
        }
      }
      slot.vehicle_id = dto.vehicle_id || null;
    }

    if (dto.slot_number !== undefined) {
      slot.slot_number = dto.slot_number.toUpperCase().trim();
    }
    if (dto.zone !== undefined) {
      slot.zone = dto.zone;
    }
    if (dto.slot_type !== undefined) {
      slot.slot_type = dto.slot_type;
    }
    if (dto.status !== undefined) {
      slot.status = dto.status;
    } else if (dto.flat_id || dto.resident_id || dto.vehicle_id) {
      if (slot.status === 'AVAILABLE') {
        slot.status = 'OCCUPIED';
      }
    }

    await this.parkingRepository.save(slot);
    return this.findOne(id, orgContext);
  }

  async remove(
    id: string,
    orgContext: OrganizationContext,
  ): Promise<ParkingSlot> {
    const slot = await this.findOne(id, orgContext);
    await this.parkingRepository.delete({ id: slot.id });
    return slot;
  }
}

import { BusinessNotificationEvents } from '../notifications/delivery/business-notification-events';
import { NotificationCategory } from '../notifications/notification-preferences.policy';
import {
  Injectable,
  Optional,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Between, DataSource, EntityManager, In } from 'typeorm';
import { randomUUID } from 'crypto';
import { Amenity } from '../database/entities/amenity.entity';
import { AmenityBooking } from '../database/entities/amenity-booking.entity';
import { Resident } from '../database/entities/resident.entity';
import { Flat } from '../database/entities/flat.entity';
import { CreateAmenityDto, UpdateAmenityDto } from './dto/amenity.dto';
import { CreateAmenityBookingDto, UpdateBookingStatusDto } from './dto/amenity-booking.dto';

@Injectable()
export class AmenitiesService {
  constructor(
    private readonly dataSource: DataSource,
    @Optional()
    private readonly notificationEvents?: BusinessNotificationEvents,
  ) {}

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

  // --- AMENITIES ---

  async findAllAmenities(orgContext: any): Promise<Amenity[]> {
    const orgId = this.resolveOrgId(orgContext);
    const repo = this.dataSource.getRepository(Amenity);
    return repo.find({
      where: { organization_id: orgId },
      order: { created_at: 'ASC' },
    });
  }

  async getAmenityImageFileId(id: string, orgContext: any): Promise<string | null> {
    const orgId = this.resolveOrgId(orgContext);
    const amenity = await this.dataSource.getRepository(Amenity).findOne({
      where: { id, organization_id: orgId },
      select: { id: true, image_file_id: true },
    });
    if (!amenity) throw new NotFoundException('Amenity not found or access denied');
    return amenity.image_file_id;
  }

  async createAmenity(dto: CreateAmenityDto, orgContext: any): Promise<Amenity> {
    const orgId = this.resolveOrgId(orgContext);
    const repo = this.dataSource.getRepository(Amenity);

    const existing = await repo.findOne({
      where: { organization_id: orgId, code: dto.code.trim().toUpperCase() },
    });
    if (existing) {
      throw new BadRequestException(`Amenity code '${dto.code}' already exists in this society`);
    }

    const amenity = repo.create({
      id: randomUUID(),
      organization_id: orgId,
      name: dto.name,
      code: dto.code.trim().toUpperCase(),
      icon: dto.icon || 'pool',
      category: dto.category || null,
      description: dto.description || null,
      image_file_id: dto.image_file_id || null,
      location: dto.location || null,
      capacity: dto.capacity ?? 20,
      open_time: dto.open_time || '06:00',
      close_time: dto.close_time || '22:00',
      slot_duration: dto.slot_duration || '60 mins',
      price: dto.price ?? 0,
      guest_fee: dto.guest_fee ?? 0,
      status_text: dto.status_text || null,
      status: dto.status || 'Active',
    });

    return repo.save(amenity);
  }

  async updateAmenity(id: string, dto: UpdateAmenityDto, orgContext: any): Promise<Amenity> {
    const orgId = this.resolveOrgId(orgContext);
    const repo = this.dataSource.getRepository(Amenity);

    const amenity = await repo.findOne({ where: { id, organization_id: orgId } });
    if (!amenity) {
      throw new NotFoundException('Amenity not found or access denied');
    }

    if (dto.name !== undefined) amenity.name = dto.name;
    if (dto.code !== undefined) amenity.code = dto.code.trim().toUpperCase();
    if (dto.icon !== undefined) amenity.icon = dto.icon;
    if (dto.category !== undefined) amenity.category = dto.category;
    if (dto.description !== undefined) amenity.description = dto.description;
    if (dto.image_file_id !== undefined) amenity.image_file_id = dto.image_file_id;
    if (dto.location !== undefined) amenity.location = dto.location;
    if (dto.capacity !== undefined) amenity.capacity = dto.capacity;
    if (dto.open_time !== undefined) amenity.open_time = dto.open_time;
    if (dto.close_time !== undefined) amenity.close_time = dto.close_time;
    if (dto.slot_duration !== undefined) amenity.slot_duration = dto.slot_duration;
    if (dto.price !== undefined) amenity.price = dto.price;
    if (dto.guest_fee !== undefined) amenity.guest_fee = dto.guest_fee;
    if (dto.status_text !== undefined) amenity.status_text = dto.status_text;
    if (dto.status !== undefined) amenity.status = dto.status;
    amenity.updated_at = new Date();

    return repo.save(amenity);
  }

  async deleteAmenity(id: string, orgContext: any): Promise<{ deleted: boolean }> {
    const orgId = this.resolveOrgId(orgContext);
    const repo = this.dataSource.getRepository(Amenity);

    const amenity = await repo.findOne({ where: { id, organization_id: orgId } });
    if (!amenity) {
      throw new NotFoundException('Amenity not found or access denied');
    }

    await repo.remove(amenity);
    return { deleted: true };
  }

  // --- BOOKINGS ---

  async findAllBookings(orgContext: any, userId?: string, isResident?: boolean): Promise<AmenityBooking[]> {
    const orgId = this.resolveOrgId(orgContext);
    const repo = this.dataSource.getRepository(AmenityBooking);

    // If resident and not super/society admin, return only their bookings
    const where: any = { organization_id: orgId };
    if (isResident && !userId) {
      return [];
    }
    if (isResident && userId) {
      // Find resident details
      const residentRecord = await this.dataSource.getRepository(Resident).findOne({
        where: { user_id: userId, organization_id: orgId },
      }) as any;
      if (!residentRecord) {
        return [];
      }
      where.resident_id = residentRecord.id;
    }

    return repo.find({ where, order: { created_at: 'DESC' } });
  }

  async findAmenityAvailability(
    id: string,
    from: string,
    to: string,
    orgContext: any,
  ): Promise<Array<{ date: string; slots: string[] }>> {
    const orgId = this.resolveOrgId(orgContext);
    const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
      && Number.isFinite(Date.parse(`${value}T00:00:00.000Z`))
      && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
    if (!validDate(from) || !validDate(to) || from > to) throw new BadRequestException('Invalid availability date range');
    const dayCount = (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86_400_000 + 1;
    if (dayCount > 62) throw new BadRequestException('Availability range cannot exceed 62 days');

    const amenity = await this.dataSource.getRepository(Amenity).findOne({ where: { id, organization_id: orgId } });
    if (!amenity) throw new NotFoundException('Amenity not found or access denied');
    const bookings = await this.dataSource.getRepository(AmenityBooking).find({
      where: { organization_id: orgId, amenity_id: id, date: Between(from, to), status: In(['Pending', 'Approved']) },
      select: { date: true, slot: true },
      order: { date: 'ASC' },
    });
    const byDate = new Map<string, Set<string>>();
    for (const booking of bookings) {
      const slots = byDate.get(booking.date) ?? new Set<string>();
      slots.add(booking.slot);
      byDate.set(booking.date, slots);
    }
    return [...byDate.entries()].map(([date, slots]) => ({ date, slots: [...slots] }));
  }

  async createBooking(dto: CreateAmenityBookingDto, orgContext: any, userId: string, isResident: boolean): Promise<AmenityBooking> {
    const orgId = this.resolveOrgId(orgContext);
    return this.dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(AmenityBooking);

    this.slotRange(dto.slot);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.date) || !Number.isFinite(Date.parse(dto.date)) || new Date(dto.date).toISOString().slice(0, 10) !== dto.date) throw new BadRequestException('Invalid booking date');
    let resident: Resident | null = null;
    if (isResident) {
      resident = await manager.getRepository(Resident).findOne({
        where: { user_id: userId, organization_id: orgId, isActive: true },
      });
      if (!resident || (dto.resident_id && dto.resident_id !== resident.id)) {
        throw new ForbiddenException('Resident profile not found or access denied');
      }
    } else if (dto.resident_id) {
      resident = await manager.getRepository(Resident).findOne({
        where: { id: dto.resident_id, organization_id: orgId, isActive: true },
      });
      if (!resident) throw new ForbiddenException('Resident profile not found or access denied');
    }
    let residentName = dto.resident;
    let flatName = dto.flat;
    if (resident) {
      const flat = resident.flat_id ? await manager.getRepository(Flat).findOne({
        where: { id: resident.flat_id, organization_id: orgId },
      }) : null;
      if (!flat) throw new ForbiddenException('Resident flat not found or access denied');
      residentName = resident.name || 'Resident';
      flatName = flat.flat_identifier;
    }

    // Find amenity by ID or by Name within this organization
    const amenityRepo = manager.getRepository(Amenity);
    let matchedAmenity: Amenity | null = null;
    if (dto.amenity_id) {
      matchedAmenity = await amenityRepo.findOne({
        where: { id: dto.amenity_id, organization_id: orgId },
        lock: { mode: 'pessimistic_write' },
      });
    } else {
      matchedAmenity = await amenityRepo.findOne({
        where: { name: dto.amenity, organization_id: orgId },
        lock: { mode: 'pessimistic_write' },
      });
    }

    if (!matchedAmenity) throw new NotFoundException('Amenity not found or access denied');
    if (matchedAmenity) {
      if (matchedAmenity.status === 'Closed (Maintenance)') {
        throw new BadRequestException(`${matchedAmenity.name} is currently closed for maintenance and cannot be booked`);
      }
      if (dto.guests > matchedAmenity.capacity) {
        throw new BadRequestException(`Guest count (${dto.guests}) exceeds maximum capacity of ${matchedAmenity.capacity}`);
      }
    }

    this.validateTiming(matchedAmenity, dto.slot);
    await this.assertAvailable(manager, orgId, matchedAmenity.id, dto.date, dto.slot);
    const booking = repo.create({
      id: randomUUID(),
      organization_id: orgId,
      amenity_id: matchedAmenity?.id || null,
      amenity: matchedAmenity?.name || dto.amenity,
      resident_id: resident?.id ?? null,
      resident: residentName || 'Administrator',
      flat: flatName || '—',
      date: dto.date,
      slot: dto.slot,
      guests: dto.guests,
      amount: dto.amount ?? matchedAmenity?.price ?? 0,
      status: 'Pending',
    });

    return repo.save(booking);
    });
  }

  async updateBookingStatus(id: string, dto: UpdateBookingStatusDto, orgContext: any, actorUserId: string, isResident: boolean): Promise<AmenityBooking> {
    const orgId = this.resolveOrgId(orgContext);
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(AmenityBooking);
      // Serialize every transition for an amenity, including concurrent approvals.
      const reference = await repo.findOne({ where: { id, organization_id: orgId } });
      if (!reference) throw new NotFoundException('Booking record not found or access denied');
      const facility = reference.amenity_id ? await manager.getRepository(Amenity).findOne({
        where: { id: reference.amenity_id, organization_id: orgId }, lock: { mode: 'pessimistic_write' },
      }) : null;
      const booking = await repo.findOne({ where: { id, organization_id: orgId }, lock: { mode: 'pessimistic_write' } });
      if (!booking) throw new NotFoundException('Booking record not found or access denied');
      if (isResident) {
        const resident = await manager.getRepository(Resident).findOne({ where: { user_id: actorUserId, organization_id: orgId, isActive: true } });
        if (!resident || booking.resident_id !== resident.id) throw new ForbiddenException('Booking access denied');
        if (dto.status !== 'Cancelled') throw new ForbiddenException('Residents may only cancel their own bookings');
      }
      const transitions: Record<string, string[]> = { Pending: ['Approved', 'Rejected', 'Cancelled'], Approved: ['Revoked', 'Cancelled'] };
      if (!transitions[booking.status]?.includes(dto.status)) throw new ConflictException(`Cannot change ${booking.status} booking to ${dto.status}`);
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      if (booking.status === 'Approved' && booking.date < today && ['Revoked', 'Cancelled'].includes(dto.status)) {
        throw new ConflictException('Past booking approvals cannot be revoked or cancelled');
      }
      if (dto.status === 'Approved') {
        if (facility) this.validateTiming(facility, booking.slot);
        if (facility?.status === 'Closed (Maintenance)') throw new BadRequestException('Amenity is closed for maintenance');
        if (facility && booking.guests > facility.capacity) throw new BadRequestException('Guest count exceeds current amenity capacity');
        if (!booking.amenity_id) throw new BadRequestException('Legacy booking must be linked to an amenity before approval');
        await this.assertAvailable(manager, orgId, booking.amenity_id, booking.date, booking.slot, booking.id);
      }
      booking.status = dto.status;
      const now = new Date();
      if (dto.status === 'Approved') { booking.approved_by = actorUserId; booking.approved_at = now; }
      if (dto.status === 'Rejected') { booking.rejected_by = actorUserId; booking.rejected_at = now; }
      if (dto.status === 'Cancelled') { booking.cancelled_by = actorUserId; booking.cancelled_at = now; }
      if (dto.status === 'Revoked') { booking.revoked_by = actorUserId; booking.revoked_at = now; }
      booking.updated_at = now;
      const saved = await repo.save(booking);
      if (saved.resident_id) {
        await this.notificationEvents?.resident(
          manager,
          orgId,
          saved.resident_id,
          NotificationCategory.AMENITY,
          saved.id,
          `booking:${saved.id}:${saved.status}`,
        );
      }
      return saved;
    });
  }

  private validateTiming(amenity: Amenity, slot: string): void {
    const [start, end] = this.slotRange(slot);
    if (amenity.open_time && amenity.close_time) {
      const [open, close] = this.slotRange(`${amenity.open_time.slice(0, 5)} - ${amenity.close_time.slice(0, 5)}`);
      if (start < open || end > close) throw new BadRequestException('Booking must be within amenity operating hours');
    }
    const duration = amenity.slot_duration?.match(/^(\d+(?:\.\d+)?)\s*(mins?|minutes?|hrs?|hours?)$/i);
    if (duration) {
      const minutes = Number(duration[1]) * (/^(hr|hour)/i.test(duration[2]) ? 60 : 1);
      if (end - start !== minutes) throw new BadRequestException('Booking must match the configured slot duration');
    }
  }

  private slotRange(slot: string): [number, number] {
    const match = slot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) throw new BadRequestException('Use a time range such as 06:00 AM - 08:00 AM');
    const minutes = (hour: string, minute: string, period?: string) => {
      let h = Number(hour); const m = Number(minute);
      if (m > 59 || (period ? h < 1 || h > 12 : h > 23)) throw new BadRequestException('Invalid booking time');
      if (period) h = h % 12 + (period.toUpperCase() === 'PM' ? 12 : 0);
      return h * 60 + m;
    };
    const start = minutes(match[1], match[2], match[3]);
    const end = minutes(match[4], match[5], match[6]);
    if (end <= start) throw new BadRequestException('Booking end time must be after start time');
    return [start, end];
  }

  private async assertAvailable(manager: EntityManager, orgId: string, amenityId: string, date: string, slot: string, excludeId?: string): Promise<void> {
    const [start, end] = this.slotRange(slot);
    const active = await manager.getRepository(AmenityBooking).find({ where: {
      organization_id: orgId, amenity_id: amenityId, date, status: In(['Pending', 'Approved']),
    } });
    for (const booking of active) {
      if (booking.id === excludeId) continue;
      let range: [number, number];
      try { range = this.slotRange(booking.slot); }
      catch { throw new ConflictException('Existing booking has an unrecognized time slot; contact society administration'); }
      if (start < range[1] && end > range[0]) throw new ConflictException('This amenity already has a booking for the selected time');
    }
  }
}

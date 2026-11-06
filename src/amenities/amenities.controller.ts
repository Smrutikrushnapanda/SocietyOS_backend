import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  ForbiddenException,
  NotFoundException,
  ParseUUIDPipe,
  Response,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { RequireOrganizationId } from '../authorization/require-permission.decorator';
import { AmenitiesService } from './amenities.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { CreateAmenityDto, UpdateAmenityDto } from './dto/amenity.dto';
import { CreateAmenityBookingDto, UpdateBookingStatusDto } from './dto/amenity-booking.dto';
import { Amenity } from '../database/entities/amenity.entity';
import { AmenityBooking } from '../database/entities/amenity-booking.entity';
import { FileService } from '../files/file.service';

@Controller('amenities')
@UseGuards(AuthGuard, OrganizationGuard, PermissionGuard)
export class AmenitiesController {
  constructor(
    private readonly amenitiesService: AmenitiesService,
    private readonly authorizationService: AuthorizationService,
    private readonly fileService: FileService,
  ) {}

  private async actor(req: any): Promise<{ id: string; roles: string[] }> {
    const membership = await this.authorizationService.getUserRole(req.user.id, req.orgContext.organizationId);
    if (!membership) throw new ForbiddenException('Organization membership required');
    return { id: req.user.id, roles: [membership.role.name] };
  }

  // --- AMENITIES ---

  @Get()
  @RequirePermission('amenity:read')
  @RequireOrganizationId()
  async getAmenities(@Request() req: any): Promise<Amenity[]> {
    return this.amenitiesService.findAllAmenities(req.orgContext);
  }

  @Get(':id/image')
  @RequirePermission('amenity:read')
  @RequireOrganizationId()
  async getAmenityImage(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Response() res: any,
  ) {
    const fileId = await this.amenitiesService.getAmenityImageFileId(id, req.orgContext);
    if (!fileId) throw new NotFoundException('Amenity photo not found');
    const { buffer, metadata } = await this.fileService.retrieve(
      fileId,
      req.orgContext.organizationId,
      await this.actor(req),
    );
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(metadata.mime_type)) {
      throw new NotFoundException('Amenity photo not found');
    }
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'private, no-store');
    res.set('Content-Type', metadata.mime_type);
    res.set('Content-Disposition', 'inline');
    res.send(buffer);
  }

  // --- BOOKINGS (Declared before :id route) ---

  @Get('bookings')
  @RequirePermission('amenity:read')
  @RequireOrganizationId()
  async getBookings(@Request() req: any): Promise<AmenityBooking[]> {
    const membership = await this.authorizationService.getUserRole(req.user.id, req.orgContext.organizationId);
    if (!membership || !['RESIDENT', 'SOCIETY_ADMIN', 'SUPER_ADMIN'].includes(membership.role.name)) throw new ForbiddenException('Booking access denied');
    const isResident = membership.role.name === 'RESIDENT';
    return this.amenitiesService.findAllBookings(req.orgContext, req.user?.id, isResident);
  }

  @Get(':id/availability')
  @RequirePermission('amenity:read')
  @RequireOrganizationId()
  async getAmenityAvailability(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<Array<{ date: string; slots: string[] }>> {
    const membership = await this.authorizationService.getUserRole(req.user.id, req.orgContext.organizationId);
    if (!membership || !['RESIDENT', 'SOCIETY_ADMIN', 'SUPER_ADMIN'].includes(membership.role.name)) throw new ForbiddenException('Amenity access denied');
    return this.amenitiesService.findAmenityAvailability(id, from, to, req.orgContext);
  }

  @Post('bookings')
  @RequirePermission('amenity:read')
  @RequireOrganizationId()
  async createBooking(
    @Request() req: any,
    @Body() dto: CreateAmenityBookingDto,
  ): Promise<AmenityBooking> {
    const membership = await this.authorizationService.getUserRole(req.user.id, req.orgContext.organizationId);
    if (!membership || !['RESIDENT', 'SOCIETY_ADMIN', 'SUPER_ADMIN'].includes(membership.role.name)) {
      throw new ForbiddenException('Booking access denied');
    }
    return this.amenitiesService.createBooking(dto, req.orgContext, req.user.id, membership.role.name === 'RESIDENT');
  }

  @Patch('bookings/:id/status')
  @RequirePermission('amenity:manage')
  @RequireOrganizationId()
  async updateBookingStatus(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingStatusDto,
  ): Promise<AmenityBooking> {
    const membership = await this.authorizationService.getUserRole(req.user.id, req.orgContext.organizationId);
    if (!membership || !['SOCIETY_ADMIN', 'SUPER_ADMIN'].includes(membership.role.name)) throw new ForbiddenException('Admin access required');
    return this.amenitiesService.updateBookingStatus(id, dto, req.orgContext, req.user.id, false);
  }

  @Patch('bookings/:id/cancel')
  @RequirePermission('amenity:read')
  @RequireOrganizationId()
  async cancelOwnBooking(@Request() req: any, @Param('id', ParseUUIDPipe) id: string): Promise<AmenityBooking> {
    const membership = await this.authorizationService.getUserRole(req.user.id, req.orgContext.organizationId);
    if (membership?.role.name !== 'RESIDENT') throw new ForbiddenException('Resident access required');
    return this.amenitiesService.updateBookingStatus(id, { status: 'Cancelled' }, req.orgContext, req.user.id, true);
  }

  // --- AMENITY CRUD ---

  @Post()
  @RequirePermission('amenity:manage')
  @RequireOrganizationId()
  async createAmenity(
    @Request() req: any,
    @Body() dto: CreateAmenityDto,
  ): Promise<Amenity> {
    return this.amenitiesService.createAmenity(dto, req.orgContext);
  }

  @Put(':id')
  @RequirePermission('amenity:manage')
  @RequireOrganizationId()
  async updateAmenity(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAmenityDto,
  ): Promise<Amenity> {
    return this.amenitiesService.updateAmenity(id, dto, req.orgContext);
  }

  @Delete(':id')
  @RequirePermission('amenity:manage')
  @RequireOrganizationId()
  async deleteAmenity(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ deleted: boolean }> {
    return this.amenitiesService.deleteAmenity(id, req.orgContext);
  }
}

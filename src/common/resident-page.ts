import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataSource, type EntityTarget, type ObjectLiteral, type SelectQueryBuilder } from 'typeorm';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { CollectionPageDto } from './pagination.dto';
import { Resident } from '../database/entities/resident.entity';
export class ResidentPageDto extends CollectionPageDto {
  @IsOptional() @IsUUID() recordId?: string;
  @IsOptional() @IsString() @IsIn(['all', 'active', 'completed', 'requested', 'approved', 'checked-in', 'checked-out', 'denied', 'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'])
  tab?: string;
}
export async function residentPage<T extends ObjectLiteral>(source: DataSource, entity: EntityTarget<T>, userId: string, context: { organizationId?: string; organization_id?: string; targetOrganizationId?: string }, query: ResidentPageDto, ownerColumn: 'resident_id' | 'host_resident_id', dateColumn: string, customize?: (query: SelectQueryBuilder<T>) => void) {
  const organizationId = context.targetOrganizationId ?? context.organizationId ?? context.organization_id;
  if (!organizationId || !userId) throw new ForbiddenException('Resident organization context required');
  const resident = await source.getRepository(Resident).findOneBy({ user_id: userId, organization_id: organizationId, isActive: true });
  if (!resident) throw new NotFoundException('Active resident not found in this organization');
  const qb = source.getRepository(entity).createQueryBuilder('record').where('record.organization_id = :organizationId', { organizationId }).andWhere(`record.${ownerColumn} = :residentId`, { residentId: resident.id });
  if (query.recordId) qb.andWhere('record.id = :recordId', { recordId: query.recordId });
  customize?.(qb);
  const [items, total] = await qb.orderBy(`record.${dateColumn}`, 'DESC').addOrderBy('record.id', 'DESC').skip((query.page - 1) * query.limit).take(query.limit).getManyAndCount();
  return { items, total, page: query.page, limit: query.limit, totalPages: Math.max(1, Math.ceil(total / query.limit)) };
}

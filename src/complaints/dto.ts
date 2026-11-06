import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export enum ComplaintCategory {
  MAINTENANCE = 'MAINTENANCE',
  FACILITY = 'FACILITY',
  AMENITY = 'AMENITY',
  SAFETY = 'SAFETY',
  OTHER = 'OTHER',
}

export class CreateComplaintDto {
  @IsOptional()
  @IsUUID()
  resident_id?: string;

  @IsUUID()
  @IsNotEmpty()
  flat_id: string;

  @IsEnum(ComplaintCategory)
  @IsNotEmpty()
  category: ComplaintCategory;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @IsOptional()
  @IsUUID()
  assigned_to?: string;

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class UpdateComplaintDto {
  @IsOptional()
  @IsEnum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'])
  status?: string;

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';

  @IsOptional()
  @IsUUID()
  assigned_to?: string;
}

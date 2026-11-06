import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsIn,
} from 'class-validator';

export class UpdateParkingSlotDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  slot_number?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  zone?: string;

  @IsString()
  @IsOptional()
  @IsIn(['4W', '2W', 'EV'])
  slot_type?: string;

  @IsString()
  @IsOptional()
  @IsIn(['AVAILABLE', 'OCCUPIED', 'RESERVED'])
  status?: string;

  @IsUUID()
  @IsOptional()
  flat_id?: string;

  @IsUUID()
  @IsOptional()
  resident_id?: string;

  @IsUUID()
  @IsOptional()
  vehicle_id?: string;
}

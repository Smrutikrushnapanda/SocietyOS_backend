import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsIn,
} from 'class-validator';

export class UpdateVehicleDto {
  @IsUUID()
  @IsOptional()
  resident_id?: string;

  @IsUUID()
  @IsOptional()
  flat_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  registration_number?: string;

  @IsString()
  @IsOptional()
  @IsIn(['4W', '2W', 'EV', 'OTHER', 'FOUR_WHEELER', 'TWO_WHEELER'])
  vehicle_type?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  make_model?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  color?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  rfid_tag?: string;

  @IsUUID()
  @IsOptional()
  parking_slot_id?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

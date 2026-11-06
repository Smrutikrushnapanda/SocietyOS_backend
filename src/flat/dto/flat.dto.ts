import { IsNotEmpty, IsOptional, IsString, IsNumber, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateFlatDto {
  @IsUUID()
  @IsNotEmpty()
  building_id: string;

  @IsUUID()
  @IsNotEmpty()
  floor_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  flat_identifier: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  flat_type?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maintenance_multiplier?: number;
}

export class UpdateFlatDto {
  @IsOptional()
  @IsUUID()
  building_id?: string;

  @IsOptional()
  @IsUUID()
  floor_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  flat_identifier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  flat_type?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maintenance_multiplier?: number;
}

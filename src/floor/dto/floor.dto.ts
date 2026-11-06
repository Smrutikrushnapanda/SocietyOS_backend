import { IsNotEmpty, IsOptional, IsString, IsInt, IsUUID, MaxLength } from 'class-validator';

export class CreateFloorDto {
  @IsUUID()
  @IsNotEmpty()
  building_id: string;

  @IsInt()
  @IsNotEmpty()
  floor_number: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}

export class UpdateFloorDto {
  @IsOptional()
  @IsInt()
  floor_number?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}

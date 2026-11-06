import { IsNotEmpty, IsString, IsOptional, IsInt, Min, IsNumber, IsIn } from 'class-validator';

export class CreateAmenityDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image_file_id?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  capacity?: number;

  @IsString()
  @IsOptional()
  open_time?: string;

  @IsString()
  @IsOptional()
  close_time?: string;

  @IsString()
  @IsOptional()
  slot_duration?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  guest_fee?: number;

  @IsString()
  @IsOptional()
  status_text?: string;

  @IsString()
  @IsOptional()
  @IsIn(['Active', 'Closed (Maintenance)'])
  status?: string;
}

export class UpdateAmenityDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image_file_id?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  capacity?: number;

  @IsString()
  @IsOptional()
  open_time?: string;

  @IsString()
  @IsOptional()
  close_time?: string;

  @IsString()
  @IsOptional()
  slot_duration?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  guest_fee?: number;

  @IsString()
  @IsOptional()
  status_text?: string;

  @IsString()
  @IsOptional()
  @IsIn(['Active', 'Closed (Maintenance)'])
  status?: string;
}

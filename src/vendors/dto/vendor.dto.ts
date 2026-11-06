import { IsNotEmpty, IsString, IsOptional, IsEmail, IsIn } from 'class-validator';

export class CreateVendorDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  service_category: string;

  @IsString()
  @IsNotEmpty()
  contact_person: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  sla?: string;

  @IsString()
  @IsOptional()
  @IsIn(['Active', 'Inactive'])
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateVendorDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  service_category?: string;

  @IsString()
  @IsOptional()
  contact_person?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  sla?: string;

  @IsString()
  @IsOptional()
  @IsIn(['Active', 'Inactive'])
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

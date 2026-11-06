import { IsNotEmpty, IsString, IsOptional, IsUUID, IsIn } from 'class-validator';

export class CreateStaffDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  gate?: string;

  @IsString()
  @IsOptional()
  shift?: string;

  @IsString()
  @IsOptional()
  @IsIn(['On Duty', 'Off Duty', 'Active', 'Inactive'])
  status?: string;

  @IsUUID()
  @IsOptional()
  user_id?: string;

  @IsString()
  @IsOptional()
  profile_photo_url?: string;

  @IsString()
  @IsOptional()
  aadhaar_photo_url?: string;

  @IsString()
  @IsOptional()
  aadhaar_number?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  emergency_contact?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  date_of_joining?: string;
}

/**
 * Explicit app-role assignment for a staff member.
 *
 * Staff designation (`staff_members.role`) is a free-text job title and carries
 * no authorization meaning. The app login role lives in `user_roles` and is
 * granted only through this explicit, permission-guarded endpoint.
 */
export class AssignStaffRoleDto {
  @IsUUID()
  @IsNotEmpty()
  role_id: string;
}

export class UpdateStaffDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  gate?: string;

  @IsString()
  @IsOptional()
  shift?: string;

  @IsString()
  @IsOptional()
  @IsIn(['On Duty', 'Off Duty', 'Active', 'Inactive'])
  status?: string;

  @IsUUID()
  @IsOptional()
  user_id?: string;

  @IsString()
  @IsOptional()
  profile_photo_url?: string;

  @IsString()
  @IsOptional()
  aadhaar_photo_url?: string;

  @IsString()
  @IsOptional()
  aadhaar_number?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  emergency_contact?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  date_of_joining?: string;
}

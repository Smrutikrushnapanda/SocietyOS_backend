import { IsNotEmpty, IsOptional, IsString, IsUUID, IsEnum, IsBoolean, IsEmail, IsArray, IsDateString, MaxLength, Matches } from 'class-validator';

export const RESIDENT_TYPES = ['OWNER', 'TENANT', 'FAMILY'] as const;
export type ResidentType = (typeof RESIDENT_TYPES)[number];

export class CreateResidentDto {
  @IsUUID()
  @IsNotEmpty()
  user_id: string;

  @IsOptional()
  @IsUUID()
  flat_id?: string;

  @IsOptional()
  @IsEnum(['PENDING', 'VERIFIED', 'REJECTED'])
  kyc_status?: 'PENDING' | 'VERIFIED' | 'REJECTED';

  @IsOptional()
  @IsBoolean()
  app_access_status?: boolean;
}

/**
 * Onboarding a brand-new resident in one call: creates (or reuses) the auth
 * User from the phone number, creates the resident record with profile
 * details, and grants the RESIDENT role in the target organization.
 *
 * Several residents may be onboarded onto the same flat (owner + tenant +
 * family) by calling this endpoint once per person with the same `flat_id`.
 */
export class OnboardResidentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'phone must be a valid 10 to 15 digit number with optional + country code',
  })
  phone: string;

  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsUUID()
  flat_id?: string;

  @IsOptional()
  @IsEnum(RESIDENT_TYPES)
  resident_type?: ResidentType;

  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;

  @IsOptional()
  @IsEnum(['PENDING', 'VERIFIED', 'REJECTED'])
  kyc_status?: 'PENDING' | 'VERIFIED' | 'REJECTED';

  @IsOptional()
  @IsBoolean()
  app_access_status?: boolean;

  /* ── Personal details ─────────────────────────────────────────────── */

  @IsOptional()
  @IsDateString({}, { message: 'date_of_birth must be an ISO date (YYYY-MM-DD)' })
  date_of_birth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  emergency_contact_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  emergency_contact_relationship?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'emergency_contact_phone must be a valid 10 to 15 digit number',
  })
  emergency_contact_phone?: string;

  /* ── Occupancy details ────────────────────────────────────────────── */

  @IsOptional()
  @IsDateString({}, { message: 'move_in_date must be an ISO date (YYYY-MM-DD)' })
  move_in_date?: string;

  /** FAMILY residents: relationship to the owner / primary resident. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  relationship_to_primary?: string;

  /** TENANT residents: the flat owner's name. */
  @IsOptional()
  @IsString()
  @MaxLength(150)
  owner_name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'owner_contact must be a valid 10 to 15 digit number',
  })
  owner_contact?: string;

  /** Optional per-resident profile photo (uploaded via POST /files/upload). */
  @IsOptional()
  @IsUUID()
  profile_photo_file_id?: string;

  @IsOptional()
  @IsArray()
  vehicle_details?: Array<{
    type?: string;
    make?: string;
    model?: string;
    registration?: string;
    color?: string;
  }>;
}

export class UpdateResidentDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsUUID()
  flat_id?: string;

  @IsOptional()
  @IsEnum(RESIDENT_TYPES)
  resident_type?: ResidentType;

  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;

  @IsOptional()
  @IsEnum(['PENDING', 'VERIFIED', 'REJECTED'])
  kyc_status?: 'PENDING' | 'VERIFIED' | 'REJECTED';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /**
   * Mobile number (login identity). Stored on the auth User, not the resident
   * profile. Must stay unique across all users.
   */
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'phone must be a valid 10 to 15 digit number with optional + country code',
  })
  phone?: string;

  @IsOptional()
  @IsDateString({}, { message: 'date_of_birth must be an ISO date (YYYY-MM-DD)' })
  date_of_birth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  emergency_contact_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  emergency_contact_relationship?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'emergency_contact_phone must be a valid 10 to 15 digit number',
  })
  emergency_contact_phone?: string;

  @IsOptional()
  @IsDateString({}, { message: 'move_in_date must be an ISO date (YYYY-MM-DD)' })
  move_in_date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  relationship_to_primary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  owner_name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'owner_contact must be a valid 10 to 15 digit number',
  })
  owner_contact?: string;

  @IsOptional()
  @IsUUID()
  profile_photo_file_id?: string;

  @IsOptional()
  @IsArray()
  vehicle_details?: Array<{
    type?: string;
    make?: string;
    model?: string;
    registration?: string;
    color?: string;
  }>;
}

export class BulkImportResidentsDto {
  records: Array<{
    name: string;
    phone: string;
    email?: string;
    flat_identifier?: string;
    building_name?: string;
    resident_type?: ResidentType;
    is_primary?: boolean;
  }>;
}

export class AssignFlatDto {
  @IsUUID()
  @IsNotEmpty()
  flat_id: string;
}

export class UpdateAppAccessDto {
  @IsBoolean()
  @IsNotEmpty()
  app_access_status: boolean;
}

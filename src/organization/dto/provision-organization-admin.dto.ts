import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * Provision an organization administrator (SOCIETY_ADMIN) for a target
 * organization. The caller must be SUPER_ADMIN (platform-scoped). This creates
 * (or reuses) the auth User from the phone number and grants the SOCIETY_ADMIN
 * membership in `user_roles` for the explicit target organization — the sole
 * source of society membership.
 */
export class ProvisionOrganizationAdminDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message:
      'phone must be a valid 10 to 15 digit number with optional + country code',
  })
  phone: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(255)
  email?: string;
}
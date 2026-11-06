import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsUUID,
  MaxLength,
  MinLength,
  Matches,
  IsOptional,
} from 'class-validator';

/**
 * Normalizes an Indian or international mobile number to standard +91XXXXXXXXXX or E.164.
 */
export function normalizeWhatsappNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  if (raw.startsWith('+')) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

/**
 * Normalizes email by trimming whitespace and converting to lowercase.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export class CreateAdminUserDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'whatsappNumber must be a valid 10 to 15 digit phone number with optional + country code',
  })
  whatsappNumber: string;

  @IsEmail({}, { message: 'email must be a valid email address' })
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  fullName: string;

  @IsUUID('4', { message: 'roleId must be a valid UUID' })
  @IsNotEmpty()
  roleId: string;
}

export class UpdateAdminUserDto {
  @IsString()
  @IsOptional()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'whatsappNumber must be a valid 10 to 15 digit phone number with optional + country code',
  })
  whatsappNumber?: string;

  @IsEmail({}, { message: 'email must be a valid email address' })
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(150)
  fullName?: string;

  @IsUUID('4', { message: 'roleId must be a valid UUID' })
  @IsOptional()
  roleId?: string;
}

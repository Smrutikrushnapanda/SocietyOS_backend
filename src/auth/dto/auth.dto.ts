import { IsOptional, IsUUID, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class OTPIsRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  mobileNumber: string;
}

export class OTPIsVerifiedDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  mobileNumber: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  otp: string;
}

export class RefreshTokenDto {
  @IsOptional()
  @IsUUID()
  rotationId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(256)
  refreshToken: string;
}

export class LogoutDto {
  @IsString()
  @IsOptional()
  @MaxLength(256)
  refreshToken: string;
}

export class PasswordLoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  mobileNumber: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(128)
  password: string;
}

export class ForgotPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  mobileNumber: string;
}

export class VerifyRecoveryOtpDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  mobileNumber: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  otp: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  recoveryToken: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}

export class WhatsAppOtpRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  mobileNumber: string;
}

export class WhatsAppOtpVerifyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  mobileNumber: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  otp: string;
}

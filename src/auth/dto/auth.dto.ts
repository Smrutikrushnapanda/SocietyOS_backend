export class OTPIsRequestDto {
  mobileNumber: string;
}

export class OTPIsVerifiedDto {
  mobileNumber: string;
  otp: string;
}

export class RefreshTokenDto {
  refreshToken: string;
}

export class LogoutDto {
  refreshToken: string;
}

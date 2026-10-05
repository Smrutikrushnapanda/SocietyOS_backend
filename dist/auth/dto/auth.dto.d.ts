export declare class OTPIsRequestDto {
    mobileNumber: string;
}
export declare class OTPIsVerifiedDto {
    mobileNumber: string;
    otp: string;
}
export declare class RefreshTokenDto {
    refreshToken: string;
}
export declare class LogoutDto {
    refreshToken: string;
}

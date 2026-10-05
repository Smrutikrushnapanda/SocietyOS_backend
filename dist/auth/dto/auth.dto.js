"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogoutDto = exports.RefreshTokenDto = exports.OTPIsVerifiedDto = exports.OTPIsRequestDto = void 0;
class OTPIsRequestDto {
    mobileNumber;
}
exports.OTPIsRequestDto = OTPIsRequestDto;
class OTPIsVerifiedDto {
    mobileNumber;
    otp;
}
exports.OTPIsVerifiedDto = OTPIsVerifiedDto;
class RefreshTokenDto {
    refreshToken;
}
exports.RefreshTokenDto = RefreshTokenDto;
class LogoutDto {
    refreshToken;
}
exports.LogoutDto = LogoutDto;
//# sourceMappingURL=auth.dto.js.map
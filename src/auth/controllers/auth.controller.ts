import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from '../auth.service';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  async requestOTP(@Body() body: any) {
    const mobileNumber = body?.mobileNumber;
    if (!mobileNumber) {
      return {
        success: false,
        message: 'Mobile number is required',
      };
    }
    return this.authService.requestOTP(mobileNumber);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOTP(@Body() body: any) {
    const mobileNumber = body?.mobileNumber;
    const otp = body?.otp;
    if (!mobileNumber || !otp) {
      return {
        success: false,
        message: 'Mobile number and OTP are required',
      };
    }
    return this.authService.verifyOTP(mobileNumber, otp);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() body: any) {
    const refreshToken = body?.refreshToken;
    if (!refreshToken) {
      return {
        success: false,
        message: 'Refresh token is required',
      };
    }
    return this.authService.refreshToken(refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() body: any) {
    const refreshToken = body?.refreshToken;
    if (!refreshToken) {
      return {
        success: false,
        message: 'Refresh token is required',
      };
    }
    return this.authService.logout(refreshToken);
  }
}

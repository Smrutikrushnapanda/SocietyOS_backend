import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Res,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { assertSessionOrigin, deliverSession, sessionCredential, clearSessionCookie, writeSessionCookie, sessionPortal } from '../session-cookie';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from '../auth.service';
import { AuthGuard } from '../guards/auth.guard';

import {
  OTPIsRequestDto,
  OTPIsVerifiedDto,
  RefreshTokenDto,
  LogoutDto,
  PasswordLoginDto,
  ForgotPasswordDto,
  VerifyRecoveryOtpDto,
  ResetPasswordDto,
  WhatsAppOtpRequestDto,
  WhatsAppOtpVerifyDto,
} from '../dto/auth.dto';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async loginWithPassword(@Body() body: PasswordLoginDto, @Request() req?: any, @Res({ passthrough: true }) res?: Response) {
    const mobileNumber = body?.mobileNumber;
    const password = body?.password;
    if (!mobileNumber || !password) {
      throw new BadRequestException('Mobile number and password are required');
    }
    assertSessionOrigin(req);
    return deliverSession(req, res, await this.authService.loginWithPassword(mobileNumber, password, sessionPortal(req)));
  }

  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  async requestOTP(
    @Body() body: OTPIsRequestDto,
    @Headers('x-portal-role') portalRole?: string,
  ) {
    const mobileNumber = body?.mobileNumber;
    if (!mobileNumber) {
      throw new BadRequestException('Mobile number is required');
    }
    return this.authService.requestOTP(mobileNumber, 'whatsapp', portalRole, true);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOTP(@Body() body: OTPIsVerifiedDto, @Request() req?: any, @Res({ passthrough: true }) res?: Response) {
    const mobileNumber = body?.mobileNumber;
    const otp = body?.otp;
    if (!mobileNumber || !otp) {
      return {
        success: false,
        message: 'Mobile number and OTP are required',
      };
    }
    assertSessionOrigin(req);
    return deliverSession(req, res, await this.authService.verifyOTP(mobileNumber, otp, sessionPortal(req)));
  }

  @Post('whatsapp/request-otp')
  @HttpCode(HttpStatus.OK)
  async requestWhatsAppOTP(
    @Body() body: WhatsAppOtpRequestDto,
    @Headers('x-portal-role') portalRole?: string,
  ) {
    const mobileNumber = body?.mobileNumber;
    if (!mobileNumber) {
      throw new BadRequestException('Mobile number is required');
    }
    return this.authService.requestOTP(mobileNumber, 'whatsapp', portalRole, true);
  }

  @Post('whatsapp/verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyWhatsAppOTP(@Body() body: WhatsAppOtpVerifyDto, @Request() req?: any, @Res({ passthrough: true }) res?: Response) {
    const mobileNumber = body?.mobileNumber;
    const otp = body?.otp;
    if (!mobileNumber || !otp) {
      throw new BadRequestException('Mobile number and OTP are required');
    }
    assertSessionOrigin(req);
    return deliverSession(req, res, await this.authService.verifyOTP(mobileNumber, otp, sessionPortal(req)));
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    const mobileNumber = body?.mobileNumber;
    if (!mobileNumber) {
      throw new BadRequestException('Mobile number is required');
    }
    return this.authService.forgotPassword(mobileNumber);
  }

  @Post('verify-recovery-otp')
  @HttpCode(HttpStatus.OK)
  async verifyRecoveryOTP(@Body() body: VerifyRecoveryOtpDto) {
    const mobileNumber = body?.mobileNumber;
    const otp = body?.otp;
    if (!mobileNumber || !otp) {
      throw new BadRequestException('Mobile number and OTP are required');
    }
    return this.authService.verifyRecoveryOTP(mobileNumber, otp);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: ResetPasswordDto) {
    const recoveryToken = body?.recoveryToken;
    const newPassword = body?.newPassword;
    if (!recoveryToken || !newPassword) {
      throw new BadRequestException(
        'Recovery token and new password are required',
      );
    }
    return this.authService.resetPassword(recoveryToken, newPassword);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() body: RefreshTokenDto, @Request() req?: any, @Res({ passthrough: true }) res?: Response) {
    const token = sessionCredential(req, body?.refreshToken);
    if (!token) throw new UnauthorizedException('Refresh session required');
    return deliverSession(req, res, await this.authService.refreshToken(token, body?.rotationId, sessionPortal(req)));
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() body: LogoutDto, @Request() req?: any, @Res({ passthrough: true }) res?: Response) {
    const token = sessionCredential(req, body?.refreshToken);
    await this.authService.logout(token);
    clearSessionCookie(req, res);
    return { success: true };
  }

  @Post('activity')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async activity(@Request() req: any, @Res({ passthrough: true }) res?: Response) {
    assertSessionOrigin(req);
    const result = await this.authService.recordActivity(req.user.sessionId, req.user.id, sessionPortal(req));
    const token = sessionCredential(req);
    if (token) writeSessionCookie(req, res, token, result.expiresAt);
    return result;
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async getMe(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Unauthenticated');
    }
    return this.authService.getAuthContext(userId);
  }
}

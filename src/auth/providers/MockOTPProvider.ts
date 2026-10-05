import { IOTPProvider } from '../interfaces/IOTPProvider.interface';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class MockOTPProvider implements IOTPProvider {
  private readonly logger = new Logger(MockOTPProvider.name);
  private readonly otpLength = 6;
  private readonly otpExpirationMinutes = 5;
  private readonly maxAttempts = 3;
  private readonly cooldownMinutes = 60;

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async requestOTP(
    mobileNumber: string,
  ): Promise<{ otp: string; expiresAt: Date }> {
    const cooldownKey = `otp:cooldown:${mobileNumber}`;
    const cooldownExists = await this.redis.exists(cooldownKey);
    if (cooldownExists) {
      throw new Error(
        'OTP request on cooldown. Please wait before requesting another OTP.',
      );
    }

    const attemptsKey = `otp:attempts:${mobileNumber}`;
    const attempts = await this.redis.get(attemptsKey);
    const attemptsNum = attempts ? parseInt(attempts) : 0;

    const otp = this.generateOTP();
    const expiresAt = new Date(
      Date.now() + this.otpExpirationMinutes * 60 * 1000,
    );

    const otpKey = `otp:${mobileNumber}`;
    await this.redis.set(otpKey, otp);
    await this.redis.expire(otpKey, this.otpExpirationMinutes * 60);

    await this.redis.set(cooldownKey, '1');
    await this.redis.expire(cooldownKey, this.cooldownMinutes * 60);

    await this.redis.set(attemptsKey, '0');
    await this.redis.expire(attemptsKey, this.cooldownMinutes * 60);

    this.logger.log(
      `Mock OTP requested for ${mobileNumber}, expires at ${expiresAt}`,
    );
    return { otp, expiresAt };
  }

  async verifyOTP(
    mobileNumber: string,
    otp: string,
  ): Promise<{ valid: boolean }> {
    const otpKey = `otp:${mobileNumber}`;
    const storedOTP = await this.redis.get(otpKey);

    if (!storedOTP) {
      this.logger.warn(`OTP not found or expired for ${mobileNumber}`);
      return { valid: false };
    }

    const attemptsKey = `otp:attempts:${mobileNumber}`;
    const attempts = await this.redis.get(attemptsKey);
    const attemptsNum = attempts ? parseInt(attempts) : 0;

    if (attemptsNum >= this.maxAttempts) {
      this.logger.warn(`Max OTP attempts exceeded for ${mobileNumber}`);
      return { valid: false };
    }

    if (storedOTP !== otp) {
      await this.redis.incr(attemptsKey);
      this.logger.log(
        `Invalid OTP for ${mobileNumber}, attempts: ${attemptsNum + 1}`,
      );
      return { valid: false };
    }

    await this.redis.del(otpKey);
    await this.redis.del(attemptsKey);

    this.logger.log(`OTP verified successfully for ${mobileNumber}`);
    return { valid: true };
  }

  async invalidateOTP(mobileNumber: string): Promise<void> {
    const otpKey = `otp:${mobileNumber}`;
    const attemptsKey = `otp:attempts:${mobileNumber}`;
    const cooldownKey = `otp:cooldown:${mobileNumber}`;
    await this.redis.del(otpKey, attemptsKey, cooldownKey);
  }

  private generateOTP(): string {
    const characters = '0123456789';
    let result = '';
    for (let i = 0; i < this.otpLength; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }
    return result;
  }
}

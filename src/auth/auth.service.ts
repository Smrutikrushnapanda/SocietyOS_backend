import {
  Inject,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Redis } from 'ioredis';
import { DataSource } from 'typeorm';
import { User } from '../database/entities/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    @Inject(DataSource) private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
  ) {}

  private getUserRepository() {
    return this.dataSource.getRepository(User);
  }

  private generateId(): string {
    // Generate a simple UUID-like string
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  }

  async requestOTP(mobileNumber: string) {
    this.logger.log(`Request OTP for ${mobileNumber}`);

    // Check request cooldown - 60 minutes between OTP requests
    const cooldownKey = `otp:cooldown:${mobileNumber}`;
    const cooldownExists = await this.redis.exists(cooldownKey);
    if (cooldownExists) {
      const remainingTime = Math.ceil((await this.redis.ttl(cooldownKey)) / 60);
      throw new UnauthorizedException(
        `OTP request on cooldown. Please wait ${remainingTime} more minute(s).`,
      );
    }

    const userRepository = this.getUserRepository();
    let user = await userRepository.findOneBy({ mobileNumber });

    if (!user) {
      user = userRepository.create({
        id: this.generateId(),
        mobileNumber,
        isAuthenticated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await userRepository.save(user);
      this.logger.log(
        `Created new user for ${mobileNumber} with ID ${user.id}`,
      );
    } else {
      this.logger.log(`Found existing user ${user.id} for ${mobileNumber}`);
    }

    // Check max OTP requests per hour (optional extra security)
    const requestsKey = `otp:requests:${mobileNumber}`;
    const requests = await this.redis.get(requestsKey);
    const requestsNum = requests ? parseInt(requests) : 0;
    if (requestsNum >= 10) {
      throw new UnauthorizedException(
        'Too many OTP requests. Please wait before requesting another.',
      );
    }
    await this.redis.incr(requestsKey);
    await this.redis.expire(requestsKey, 60 * 60); // 1 hour TTL

    // Generate OTP and store in Redis
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const otpKey = `otp:${mobileNumber}`;
    await this.redis.set(otpKey, otp);
    await this.redis.expire(otpKey, 5 * 60);

    // Set cooldown - 60 minutes before next OTP request
    await this.redis.set(cooldownKey, '1');
    await this.redis.expire(cooldownKey, 60 * 60);

    this.logger.log(`Generated OTP for ${mobileNumber}: ${otp}`);

    return {
      success: true,
      message: 'OTP requested successfully',
      expiresAt,
    };
  }

  async verifyOTP(mobileNumber: string, otp: string) {
    this.logger.log(`Verify OTP for ${mobileNumber}`);

    const otpKey = `otp:${mobileNumber}`;
    const storedOTP = await this.redis.get(otpKey);

    if (!storedOTP) {
      this.logger.warn(`OTP not found or expired for ${mobileNumber}`);
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Check maximum OTP verification attempts - 3 attempts allowed
    // Increment attempts first, then check if exceeded
    const attemptsKey = `otp:attempts:${mobileNumber}`;
    await this.redis.incr(attemptsKey);
    const attempts = await this.redis.get(attemptsKey);
    const attemptsNum = attempts ? parseInt(attempts) : 1;

    if (attemptsNum >= 3) {
      this.logger.warn(`Max OTP attempts exceeded for ${mobileNumber}`);
      // Clean up expired OTP to prevent further attempts
      await this.redis.del(otpKey);
      throw new UnauthorizedException(
        'Maximum OTP verification attempts exceeded. Please request a new OTP.',
      );
    }

    if (storedOTP !== otp) {
      this.logger.log(
        `Invalid OTP for ${mobileNumber}, attempts: ${attemptsNum}`,
      );
      await this.redis.expire(attemptsKey, 60 * 60); // 1 hour TTL for attempts log
      throw new UnauthorizedException('Invalid OTP');
    }

    // OTP verified - consume it
    await this.redis.del(otpKey);
    await this.redis.del(`otp:attempts:${mobileNumber}`);

    const userRepository = this.getUserRepository();
    let user = await userRepository.findOneBy({ mobileNumber });

    if (!user) {
      user = userRepository.create({
        id: this.generateId(),
        mobileNumber,
        isAuthenticated: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await userRepository.save(user);
      this.logger.log(
        `Created new user for ${mobileNumber} with ID ${user.id}`,
      );
    } else {
      await userRepository.update(user.id, { isAuthenticated: true });
    }

    // Issue signed JWT access token (15 minutes = 900 seconds)
    const accessToken = this.jwtService.sign(
      { sub: user.id, mobileNumber: user.mobileNumber },
      {
        secret: process.env.JWT_ACCESS_TOKEN_SECRET,
        expiresIn: 900,
      },
    );

    // Store refresh token in Redis
    const refreshKey = `refresh_token:${user.id}`;
    await this.redis.set(refreshKey, user.id);
    await this.redis.expire(refreshKey, 7 * 24 * 60 * 60);

    return {
      user: {
        id: user.id,
        mobileNumber: user.mobileNumber,
      },
      accessToken,
      refreshToken: user.id,
    };
  }

  async refreshToken(refreshToken: string) {
    this.logger.log(`Refresh token request: ${refreshToken}`);

    // The refreshToken is the user ID
    const userId = refreshToken;

    // Validate the user exists and has a valid session
    const userRepository = this.getUserRepository();
    const user = await userRepository.findOneBy({ id: userId });

    if (!user) {
      this.logger.warn('User not found for refresh token');
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if the access token session is still valid
    const tokenKey = `access_token:${user.id}`;
    const storedAccess = await this.redis.get(tokenKey);

    if (!storedAccess) {
      this.logger.warn('Access token session expired');
      throw new UnauthorizedException(
        'Access token expired, please re-authenticate',
      );
    }

    // Rotate refresh token - invalidate current, issue new one
    await this.redis.del(`refresh_token:${userId}`);

    // Issue new signed JWT access token (15 minutes = 900 seconds)
    const accessToken = this.jwtService.sign(
      { sub: user.id, mobileNumber: user.mobileNumber },
      {
        secret: process.env.JWT_ACCESS_TOKEN_SECRET,
        expiresIn: 900,
      },
    );

    await this.redis.set(`refresh_token:${user.id}`, user.id);
    await this.redis.expire(`refresh_token:${user.id}`, 7 * 24 * 60 * 60);

    return {
      user: {
        id: user.id,
        mobileNumber: user.mobileNumber,
      },
      accessToken,
      refreshToken: user.id,
    };
  }

  async logout(refreshToken: string) {
    this.logger.log(`Logout request: ${refreshToken}`);

    // The refresh token is the user ID
    const userId = refreshToken;

    // Revoke both tokens
    await this.redis.del(`access_token:${userId}`);
    await this.redis.del(`refresh_token:${userId}`);
  }
}

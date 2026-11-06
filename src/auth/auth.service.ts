import { AuthSessions, inactivitySecondsFor } from './auth-sessions';
import { Organization } from '../database/entities/organization.entity';
import { Resident } from '../database/entities/resident.entity';
import { StaffMember } from '../database/entities/staff-member.entity';
import { AdminUser } from '../database/entities/admin-user.entity';
import { normalizeWhatsappNumber } from '../role-admin-menu/dto/admin-user.dto';
import {
  Inject,
  Injectable,
  Optional,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Redis } from 'ioredis';
import { DataSource } from 'typeorm';
import {
  createHash,
  randomBytes,
  randomInt,
  scryptSync,
  timingSafeEqual,
} from 'crypto';
import { User } from '../database/entities/user.entity';
import { AuthorizationService } from '../authorization/authorization.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

const OTP_TTL_SECONDS = 5 * 60;
const RECOVERY_TOKEN_TTL_SECONDS = 10 * 60;
const COOLDOWN_SECONDS = 120;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const derived = scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return timingSafeEqual(derived, keyBuf);
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    @Inject(DataSource) private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    @Optional() private readonly authorizationService?: AuthorizationService,
    @Optional() private readonly whatsAppService?: WhatsAppService,
  ) {}

  private getUserRepository() {
    return this.dataSource.getRepository(User);
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  }

  private get sessions() { return new AuthSessions(this.redis); }

  private async assertAccountEnabled(userId: string, organizationId?: string): Promise<User> {
    const user = await this.getUserRepository().findOneBy({ id: userId });
    if (!user) throw new UnauthorizedException('Account unavailable');
    if (!this.authorizationService) return user;
    const memberships = await this.authorizationService.getUserMemberships(userId);
    for (const member of memberships) {
      if (member.role === 'SUPER_ADMIN' && member.organizationId === null) return user;
      if (!member.organizationId || (organizationId && member.organizationId !== organizationId)) continue;
      const organization = await this.dataSource.getRepository(Organization).findOneBy({ id: member.organizationId, isActive: true });
      if (!organization) continue;
      if (member.role === 'RESIDENT') {
        const resident = await this.dataSource.getRepository(Resident).findOneBy({ user_id: userId, organization_id: member.organizationId, isActive: true, app_access_status: true });
        if (!resident) continue;
      }
      if (member.role === 'GUARD') {
        const staff = await this.dataSource.getRepository(StaffMember).findOneBy({ user_id: userId, organization_id: member.organizationId });
        if (staff?.status?.toLowerCase() === 'inactive') continue;
      }
      return user;
    }
    throw new UnauthorizedException('Account disabled or membership revoked');
  }

  async validateAccessSession(sessionId: string, userId: string, organizationId?: string) {
    if (!sessionId || !userId) throw new UnauthorizedException('Session upgrade required');
    await this.sessions.check(sessionId, userId);
    await this.assertAccountEnabled(userId);
    if (organizationId) {
      try { await this.assertAccountEnabled(userId, organizationId); }
      catch (error) { if (error instanceof UnauthorizedException) throw new ForbiddenException('Organization access unavailable'); throw error; }
    }
  }

  async recordActivity(sessionId: string, userId: string, portal?: string) {
    await this.validateAccessSession(sessionId, userId);
    const session = await this.sessions.activity(sessionId, userId, inactivitySecondsFor(portal));
    return { expiresAt: session.expiresAt, lastActivityAt: session.lastActivityAt };
  }

  private async issueSession(user: User, portal?: string) {
    await this.assertAccountEnabled(user.id);
    const { token, session } = await this.sessions.create(user.id, inactivitySecondsFor(portal));
    return this.sessionResponse(user, token, session.id, session.expiresAt);
  }

  private sessionResponse(user: User, refreshToken: string, sessionId: string, expiresAt: number) {
    const accessToken = this.jwtService.sign({ sub: user.id, mobileNumber: user.mobileNumber, sid: sessionId }, {
      secret: process.env.JWT_ACCESS_TOKEN_SECRET, expiresIn: 900, algorithm: 'HS256',
    });
    return { user: { id: user.id, mobileNumber: user.mobileNumber }, accessToken, refreshToken, sessionExpiresAt: expiresAt };
  }

  /**
   * Password login method for registered users.
   */
  async loginWithPassword(mobileNumber: string, password: string, portal?: string) {
    if (!mobileNumber || !password) {
      throw new BadRequestException('Mobile number and password are required');
    }

    const cleanNumber = mobileNumber.trim();
    const attemptsKey = `login:attempts:${cleanNumber}`;
    const attempts = await this.redis.get(attemptsKey);
    const attemptsNum = attempts ? parseInt(attempts, 10) : 0;

    if (attemptsNum >= 5) {
      throw new UnauthorizedException(
        'Too many failed login attempts. Please wait 15 minutes before retrying.',
      );
    }

    const userRepository = this.getUserRepository();
    const user = await userRepository.findOneBy({ mobileNumber: cleanNumber });

    if (!user || !user.passwordHash) {
      // Execute dummy hashing to mitigate timing enumeration attacks
      scryptSync('dummy_password', '1234567890abcdef', 64);
      await this.redis.incr(attemptsKey);
      await this.redis.expire(attemptsKey, 15 * 60);
      throw new UnauthorizedException('Invalid mobile number or password');
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      await this.redis.incr(attemptsKey);
      await this.redis.expire(attemptsKey, 15 * 60);
      throw new UnauthorizedException('Invalid mobile number or password');
    }

    // Reset failed login attempts on successful authentication
    await this.redis.del(attemptsKey);

    // Update user login metadata
    await userRepository.update(user.id, {
      isAuthenticated: true,
      lastLoginAt: new Date(),
    });

    return this.issueSession(user, portal);
  }

  async findUserByPhone(phone: string): Promise<User | null> {
    if (!phone) return null;
    const cleanDigits = phone.replace(/\D/g, '');
    const candidateNumbers = Array.from(
      new Set(
        [
          phone.trim(),
          cleanDigits,
          cleanDigits.length === 10 ? `+91${cleanDigits}` : null,
          cleanDigits.startsWith('91') && cleanDigits.length === 12
            ? `+${cleanDigits}`
            : null,
          cleanDigits.startsWith('91') && cleanDigits.length === 12
            ? cleanDigits.slice(2)
            : null,
        ].filter(Boolean),
      ),
    ) as string[];

    const userRepo = this.getUserRepository();
    for (const num of candidateNumbers) {
      const user = await userRepo.findOneBy({ mobileNumber: num });
      if (user) return user;
    }
    return null;
  }

  async requestOTP(
    mobileNumber: string,
    channel: 'sms' | 'whatsapp' = 'whatsapp',
    portalRole?: string,
    requireRegistered = false,
  ) {
    // Check request cooldown - 120 seconds between OTP requests
    const cooldownKey = `otp:cooldown:${mobileNumber}`;
    const cooldownExists = await this.redis.exists(cooldownKey);
    if (cooldownExists) {
      const remainingSec = await this.redis.ttl(cooldownKey);
      const remainingTime = Math.ceil(remainingSec / 60);
      throw new HttpException(
        `OTP request on cooldown. Please wait ${remainingTime} more minute(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const userRepository = this.getUserRepository();
    let user = await this.findUserByPhone(mobileNumber);

    if (!user) {
      if (requireRegistered) {
        throw new BadRequestException(
          'This mobile number is not registered. Please contact your society administrator.',
        );
      }
      user = userRepository.create({
        id: this.generateId(),
        mobileNumber,
        isAuthenticated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await userRepository.save(user);
    }

    // If a specific portal role is requested, verify user role holding
    if (user && portalRole && this.authorizationService) {
      const memberships = await this.authorizationService.getUserMemberships(user.id);
      const roleNames = memberships.map((m) => m.role.toUpperCase());
      const normalizedPortal = portalRole.toLowerCase();

      let isAllowed = false;
      if (normalizedPortal === 'resident') {
        isAllowed = roleNames.includes('RESIDENT') || roleNames.includes('SUPER_ADMIN');
      } else if (normalizedPortal === 'guard') {
        isAllowed = roleNames.includes('GUARD') || roleNames.includes('SUPER_ADMIN');
      } else if (normalizedPortal === 'admin') {
        isAllowed =
          roleNames.includes('SUPER_ADMIN') ||
          roleNames.includes('SOCIETY_ADMIN') ||
          roleNames.some((r) => r.includes('ADMIN'));
      } else {
        isAllowed = roleNames.length > 0;
      }

      if (!isAllowed) {
        throw new BadRequestException(
          `This mobile number is not registered as a ${normalizedPortal}. Please check the number or contact your society administrator.`,
        );
      }
    }

    // Check max OTP requests per hour (hourly cap of 10)
    const requestsKey = `otp:requests:${mobileNumber}`;
    const requests = await this.redis.get(requestsKey);
    const requestsNum = requests ? parseInt(requests, 10) : 0;
    if (requestsNum >= 10) {
      throw new HttpException(
        'Too many OTP requests. Please wait before requesting another.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    await this.redis.incr(requestsKey);
    await this.redis.expire(requestsKey, 60 * 60);

    // Cryptographically secure 6-digit OTP
    const otp = randomInt(100000, 1000000).toString();
    const otpHash = createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

    // Store OTP in Redis
    const otpKey = `otp:${mobileNumber}`;
    await this.redis.set(otpKey, otp);
    await this.redis.expire(otpKey, OTP_TTL_SECONDS);

    // Set cooldown - 120 seconds before next OTP request
    await this.redis.set(cooldownKey, '1');
    await this.redis.expire(cooldownKey, COOLDOWN_SECONDS);

    // Dispatch via WhatsApp if available and requested
    let deliveredViaWhatsApp = false;
    if (this.whatsAppService && channel === 'whatsapp') {
      try {
        deliveredViaWhatsApp = await this.whatsAppService.sendOtp(
          mobileNumber,
          otp,
        );
      } catch (err) {
        this.logger.warn(`WhatsApp OTP delivery error: ${(err as any)?.message}`);
      }
    }

    return {
      success: true,
      message: deliveredViaWhatsApp
        ? 'OTP sent via WhatsApp'
        : 'OTP requested successfully',
      channel: deliveredViaWhatsApp ? 'whatsapp' : 'system',
      expiresAt,
      cooldownSeconds: COOLDOWN_SECONDS,
    };
  }

  async verifyOTP(mobileNumber: string, otp: string, portal?: string) {
    const otpKey = `otp:${mobileNumber}`;
    const storedOTP = await this.redis.get(otpKey);

    if (!storedOTP) {
      this.logger.warn(`OTP not found or expired for ${mobileNumber}`);
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Check maximum OTP verification attempts - 3 attempts allowed
    const attemptsKey = `otp:attempts:${mobileNumber}`;
    await this.redis.incr(attemptsKey);
    const attempts = await this.redis.get(attemptsKey);
    const attemptsNum = attempts ? parseInt(attempts, 10) : 1;

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
      await this.redis.expire(attemptsKey, 60 * 60);
      throw new UnauthorizedException('Invalid OTP');
    }

    // OTP verified - consume it atomically
    await this.redis.del(otpKey);
    await this.redis.del(attemptsKey);

    const userRepository = this.getUserRepository();
    let user = await this.findUserByPhone(mobileNumber);

    if (!user) {
      user = userRepository.create({
        id: this.generateId(),
        mobileNumber,
        isAuthenticated: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await userRepository.save(user);
    } else {
      await userRepository.update(user.id, {
        isAuthenticated: true,
        lastLoginAt: new Date(),
      });
    }

    return this.issueSession(user, portal);
  }

  /**
   * Request password recovery OTP via verified WhatsApp number.
   * Generic response prevents user enumeration.
   */
  async forgotPassword(mobileNumber: string) {
    const cleanNumber = mobileNumber.trim();
    const cooldownKey = `recovery:cooldown:${cleanNumber}`;
    const onCooldown = await this.redis.exists(cooldownKey);

    if (onCooldown) {
      const remainingSec = await this.redis.ttl(cooldownKey);
      return {
        success: true,
        message: 'If the account exists, an OTP has been sent via WhatsApp.',
        cooldownSeconds: Math.max(0, remainingSec),
      };
    }

    const userRepository = this.getUserRepository();
    const user = await userRepository.findOneBy({ mobileNumber: cleanNumber });

    if (user) {
      const otp = randomInt(100000, 1000000).toString();
      const otpHash = createHash('sha256').update(otp).digest('hex');

      const recoveryOtpKey = `recovery:otp:${cleanNumber}`;
      await this.redis.set(recoveryOtpKey, otpHash, 'EX', OTP_TTL_SECONDS);

      // Set cooldown
      await this.redis.set(cooldownKey, '1', 'EX', COOLDOWN_SECONDS);

      if (this.whatsAppService) {
        try {
          await this.whatsAppService.sendPasswordRecoveryOtp(cleanNumber, otp);
        } catch (err) {
          this.logger.warn(`Failed to dispatch recovery OTP: ${(err as any)?.message}`);
        }
      }
    }

    return {
      success: true,
      message: 'If the account exists, an OTP has been sent via WhatsApp.',
      cooldownSeconds: COOLDOWN_SECONDS,
    };
  }

  /**
   * Verify password recovery OTP and issue a short-lived recovery token.
   */
  async verifyRecoveryOTP(mobileNumber: string, otp: string) {
    const cleanNumber = mobileNumber.trim();
    const recoveryOtpKey = `recovery:otp:${cleanNumber}`;
    const storedHash = await this.redis.get(recoveryOtpKey);

    if (!storedHash) {
      throw new UnauthorizedException('Invalid or expired recovery OTP');
    }

    const attemptsKey = `recovery:attempts:${cleanNumber}`;
    await this.redis.incr(attemptsKey);
    const attempts = await this.redis.get(attemptsKey);
    const attemptsNum = attempts ? parseInt(attempts, 10) : 1;

    if (attemptsNum >= 3) {
      await this.redis.del(recoveryOtpKey, attemptsKey);
      throw new UnauthorizedException(
        'Maximum verification attempts exceeded. Please request a new recovery code.',
      );
    }

    const inputHash = createHash('sha256').update(otp).digest('hex');
    if (storedHash !== inputHash) {
      throw new UnauthorizedException('Invalid recovery OTP');
    }

    // Atomically consume recovery OTP
    await this.redis.del(recoveryOtpKey, attemptsKey);

    const userRepository = this.getUserRepository();
    const user = await userRepository.findOneBy({ mobileNumber: cleanNumber });
    if (!user) {
      throw new UnauthorizedException('User account not found');
    }

    // Issue opaque 32-byte recovery token (10 minutes TTL)
    const recoveryToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(recoveryToken).digest('hex');
    await this.redis.set(
      `recovery:token:${tokenHash}`,
      user.id,
      'EX',
      RECOVERY_TOKEN_TTL_SECONDS,
    );

    return {
      success: true,
      recoveryToken,
      expiresIn: RECOVERY_TOKEN_TTL_SECONDS,
    };
  }

  /**
   * Reset password using verified recovery token and apply strict session invalidation.
   */
  async resetPassword(recoveryToken: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    const tokenHash = createHash('sha256').update(recoveryToken).digest('hex');
    const tokenKey = `recovery:token:${tokenHash}`;
    const userId = await this.redis.get(tokenKey);

    if (!userId) {
      throw new UnauthorizedException('Invalid or expired password reset session');
    }

    // Consume recovery token immediately
    await this.redis.del(tokenKey);

    const userRepository = this.getUserRepository();
    const user = await userRepository.findOneBy({ id: userId });

    if (!user) {
      throw new UnauthorizedException('User account not found');
    }

    // Hash and store new password securely
    const newHash = hashPassword(newPassword);
    await userRepository.update(user.id, {
      passwordHash: newHash,
      updatedAt: new Date(),
    });

    await this.sessions.revokeAll(user.id);

    return {
      success: true,
      message: 'Password reset successfully. Please log in with your new password.',
    };
  }

  async refreshToken(refreshToken: string, rotationId?: string, portal?: string) {
    const identity = await this.sessions.lookup(refreshToken);
    const user = await this.assertAccountEnabled(identity.userId);
    const { token, session } = await this.sessions.rotate(refreshToken, identity, rotationId, inactivitySecondsFor(portal));
    return this.sessionResponse(user, token, session.id, session.expiresAt);
  }

  async logout(refreshToken: string) {
    await this.sessions.logout(refreshToken);
    return { success: true };
  }

  async getAuthContext(userId: string) {
    const userRepository = this.getUserRepository();
    const user = await userRepository.findOneBy({ id: userId });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const memberships = this.authorizationService
      ? await this.authorizationService.getUserMemberships(user.id)
      : [];

    let fullName: string | null = null;
    if (memberships.some((membership) => ['SUPER_ADMIN', 'SOCIETY_ADMIN'].includes(membership.role))) {
      const admin = await this.dataSource.getRepository(AdminUser).findOne({
        where: [{ whatsappNumber: normalizeWhatsappNumber(user.mobileNumber) }, { whatsappNumber: user.mobileNumber }],
        select: { fullName: true },
      });
      fullName = admin?.fullName?.trim() || null;
    }
    return {
      user: {
        id: user.id,
        mobileNumber: user.mobileNumber,
        fullName,
      },
      memberships,
    };
  }
}

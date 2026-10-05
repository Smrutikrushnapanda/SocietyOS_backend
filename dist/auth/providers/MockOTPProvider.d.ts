import { IOTPProvider } from '../interfaces/IOTPProvider.interface';
import { Redis } from 'ioredis';
export declare class MockOTPProvider implements IOTPProvider {
    private readonly redis;
    private readonly logger;
    private readonly otpLength;
    private readonly otpExpirationMinutes;
    private readonly maxAttempts;
    private readonly cooldownMinutes;
    constructor(redis: Redis);
    requestOTP(mobileNumber: string): Promise<{
        otp: string;
        expiresAt: Date;
    }>;
    verifyOTP(mobileNumber: string, otp: string): Promise<{
        valid: boolean;
    }>;
    invalidateOTP(mobileNumber: string): Promise<void>;
    private generateOTP;
}

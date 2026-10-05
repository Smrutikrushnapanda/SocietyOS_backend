import { JwtService } from '@nestjs/jwt';
import { Redis } from 'ioredis';
import { DataSource } from 'typeorm';
export declare class AuthService {
    private readonly redis;
    private readonly dataSource;
    private readonly jwtService;
    private readonly logger;
    constructor(redis: Redis, dataSource: DataSource, jwtService: JwtService);
    private getUserRepository;
    private generateId;
    requestOTP(mobileNumber: string): Promise<{
        success: boolean;
        message: string;
        expiresAt: Date;
    }>;
    verifyOTP(mobileNumber: string, otp: string): Promise<{
        user: {
            id: string;
            mobileNumber: string;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    refreshToken(refreshToken: string): Promise<{
        user: {
            id: string;
            mobileNumber: string;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    logout(refreshToken: string): Promise<void>;
}

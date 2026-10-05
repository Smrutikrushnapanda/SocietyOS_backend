"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const ioredis_1 = require("ioredis");
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../database/entities/user.entity");
let AuthService = AuthService_1 = class AuthService {
    redis;
    dataSource;
    jwtService;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(redis, dataSource, jwtService) {
        this.redis = redis;
        this.dataSource = dataSource;
        this.jwtService = jwtService;
    }
    getUserRepository() {
        return this.dataSource.getRepository(user_entity_1.User);
    }
    generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
    async requestOTP(mobileNumber) {
        this.logger.log(`Request OTP for ${mobileNumber}`);
        const cooldownKey = `otp:cooldown:${mobileNumber}`;
        const cooldownExists = await this.redis.exists(cooldownKey);
        if (cooldownExists) {
            const remainingTime = Math.ceil((await this.redis.ttl(cooldownKey)) / 60);
            throw new common_1.UnauthorizedException(`OTP request on cooldown. Please wait ${remainingTime} more minute(s).`);
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
            this.logger.log(`Created new user for ${mobileNumber} with ID ${user.id}`);
        }
        else {
            this.logger.log(`Found existing user ${user.id} for ${mobileNumber}`);
        }
        const requestsKey = `otp:requests:${mobileNumber}`;
        const requests = await this.redis.get(requestsKey);
        const requestsNum = requests ? parseInt(requests) : 0;
        if (requestsNum >= 10) {
            throw new common_1.UnauthorizedException('Too many OTP requests. Please wait before requesting another.');
        }
        await this.redis.incr(requestsKey);
        await this.redis.expire(requestsKey, 60 * 60);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        const otpKey = `otp:${mobileNumber}`;
        await this.redis.set(otpKey, otp);
        await this.redis.expire(otpKey, 5 * 60);
        await this.redis.set(cooldownKey, '1');
        await this.redis.expire(cooldownKey, 60 * 60);
        this.logger.log(`Generated OTP for ${mobileNumber}: ${otp}`);
        return {
            success: true,
            message: 'OTP requested successfully',
            expiresAt,
        };
    }
    async verifyOTP(mobileNumber, otp) {
        this.logger.log(`Verify OTP for ${mobileNumber}`);
        const otpKey = `otp:${mobileNumber}`;
        const storedOTP = await this.redis.get(otpKey);
        if (!storedOTP) {
            this.logger.warn(`OTP not found or expired for ${mobileNumber}`);
            throw new common_1.UnauthorizedException('Invalid or expired OTP');
        }
        const attemptsKey = `otp:attempts:${mobileNumber}`;
        await this.redis.incr(attemptsKey);
        const attempts = await this.redis.get(attemptsKey);
        const attemptsNum = attempts ? parseInt(attempts) : 1;
        if (attemptsNum >= 3) {
            this.logger.warn(`Max OTP attempts exceeded for ${mobileNumber}`);
            await this.redis.del(otpKey);
            throw new common_1.UnauthorizedException('Maximum OTP verification attempts exceeded. Please request a new OTP.');
        }
        if (storedOTP !== otp) {
            this.logger.log(`Invalid OTP for ${mobileNumber}, attempts: ${attemptsNum}`);
            await this.redis.expire(attemptsKey, 60 * 60);
            throw new common_1.UnauthorizedException('Invalid OTP');
        }
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
            this.logger.log(`Created new user for ${mobileNumber} with ID ${user.id}`);
        }
        else {
            await userRepository.update(user.id, { isAuthenticated: true });
        }
        const accessToken = this.jwtService.sign({ sub: user.id, mobileNumber: user.mobileNumber }, {
            secret: process.env.JWT_ACCESS_TOKEN_SECRET,
            expiresIn: 900,
        });
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
    async refreshToken(refreshToken) {
        this.logger.log(`Refresh token request: ${refreshToken}`);
        const userId = refreshToken;
        const userRepository = this.getUserRepository();
        const user = await userRepository.findOneBy({ id: userId });
        if (!user) {
            this.logger.warn('User not found for refresh token');
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const tokenKey = `access_token:${user.id}`;
        const storedAccess = await this.redis.get(tokenKey);
        if (!storedAccess) {
            this.logger.warn('Access token session expired');
            throw new common_1.UnauthorizedException('Access token expired, please re-authenticate');
        }
        await this.redis.del(`refresh_token:${userId}`);
        const accessToken = this.jwtService.sign({ sub: user.id, mobileNumber: user.mobileNumber }, {
            secret: process.env.JWT_ACCESS_TOKEN_SECRET,
            expiresIn: 900,
        });
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
    async logout(refreshToken) {
        this.logger.log(`Logout request: ${refreshToken}`);
        const userId = refreshToken;
        await this.redis.del(`access_token:${userId}`);
        await this.redis.del(`refresh_token:${userId}`);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('REDIS_CLIENT')),
    __param(1, (0, common_1.Inject)(typeorm_1.DataSource)),
    __metadata("design:paramtypes", [ioredis_1.Redis,
        typeorm_1.DataSource,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map
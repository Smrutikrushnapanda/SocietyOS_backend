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
var MockOTPProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockOTPProvider = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
let MockOTPProvider = MockOTPProvider_1 = class MockOTPProvider {
    redis;
    logger = new common_1.Logger(MockOTPProvider_1.name);
    otpLength = 6;
    otpExpirationMinutes = 5;
    maxAttempts = 3;
    cooldownMinutes = 60;
    constructor(redis) {
        this.redis = redis;
    }
    async requestOTP(mobileNumber) {
        const cooldownKey = `otp:cooldown:${mobileNumber}`;
        const cooldownExists = await this.redis.exists(cooldownKey);
        if (cooldownExists) {
            throw new Error('OTP request on cooldown. Please wait before requesting another OTP.');
        }
        const attemptsKey = `otp:attempts:${mobileNumber}`;
        const attempts = await this.redis.get(attemptsKey);
        const attemptsNum = attempts ? parseInt(attempts) : 0;
        const otp = this.generateOTP();
        const expiresAt = new Date(Date.now() + this.otpExpirationMinutes * 60 * 1000);
        const otpKey = `otp:${mobileNumber}`;
        await this.redis.set(otpKey, otp);
        await this.redis.expire(otpKey, this.otpExpirationMinutes * 60);
        await this.redis.set(cooldownKey, '1');
        await this.redis.expire(cooldownKey, this.cooldownMinutes * 60);
        await this.redis.set(attemptsKey, '0');
        await this.redis.expire(attemptsKey, this.cooldownMinutes * 60);
        this.logger.log(`Mock OTP requested for ${mobileNumber}, expires at ${expiresAt}`);
        return { otp, expiresAt };
    }
    async verifyOTP(mobileNumber, otp) {
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
            this.logger.log(`Invalid OTP for ${mobileNumber}, attempts: ${attemptsNum + 1}`);
            return { valid: false };
        }
        await this.redis.del(otpKey);
        await this.redis.del(attemptsKey);
        this.logger.log(`OTP verified successfully for ${mobileNumber}`);
        return { valid: true };
    }
    async invalidateOTP(mobileNumber) {
        const otpKey = `otp:${mobileNumber}`;
        const attemptsKey = `otp:attempts:${mobileNumber}`;
        const cooldownKey = `otp:cooldown:${mobileNumber}`;
        await this.redis.del(otpKey, attemptsKey, cooldownKey);
    }
    generateOTP() {
        const characters = '0123456789';
        let result = '';
        for (let i = 0; i < this.otpLength; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }
};
exports.MockOTPProvider = MockOTPProvider;
exports.MockOTPProvider = MockOTPProvider = MockOTPProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('REDIS_CLIENT')),
    __metadata("design:paramtypes", [ioredis_1.Redis])
], MockOTPProvider);
//# sourceMappingURL=MockOTPProvider.js.map
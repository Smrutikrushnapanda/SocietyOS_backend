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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const ioredis_1 = require("ioredis");
let HealthController = class HealthController {
    dataSource;
    redis;
    constructor(dataSource, redis) {
        this.dataSource = dataSource;
        this.redis = redis;
    }
    async healthCheck() {
        const dbStatus = this.checkDatabase();
        const redisStatus = await this.checkRedis();
        const status = dbStatus && redisStatus ? 'healthy' : 'unhealthy';
        return {
            status,
            timestamp: new Date().toISOString(),
            database: dbStatus ? 'connected' : 'disconnected',
            redis: redisStatus ? 'connected' : 'disconnected',
        };
    }
    async checkRedis() {
        try {
            await this.redis.ping();
            return true;
        }
        catch {
            return false;
        }
    }
    checkDatabase() {
        try {
            this.dataSource.query('SELECT 1');
            return true;
        }
        catch {
            return false;
        }
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)('health'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "healthCheck", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)(),
    __param(0, (0, common_1.Inject)(typeorm_1.DataSource)),
    __param(1, (0, common_1.Inject)(ioredis_1.Redis)),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        ioredis_1.Redis])
], HealthController);
//# sourceMappingURL=health.controller.js.map
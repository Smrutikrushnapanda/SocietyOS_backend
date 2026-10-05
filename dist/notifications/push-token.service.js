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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushTokenService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const push_token_entity_1 = require("../database/entities/push-token.entity");
const crypto_1 = require("crypto");
let PushTokenService = class PushTokenService {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async register(userId, organizationId, token, platform) {
        const repo = this.dataSource.getRepository(push_token_entity_1.PushToken);
        const existing = await repo.findOne({ where: { user_id: userId, token } });
        if (existing) {
            existing.is_active = true;
            existing.last_seen_at = new Date();
            existing.updated_at = new Date();
            existing.organization_id = organizationId;
            return repo.save(existing);
        }
        const pushToken = repo.create({
            id: (0, crypto_1.randomUUID)(),
            user_id: userId,
            organization_id: organizationId,
            token,
            platform,
            is_active: true,
            last_seen_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
        });
        return repo.save(pushToken);
    }
    async deactivate(tokenId, userId) {
        const repo = this.dataSource.getRepository(push_token_entity_1.PushToken);
        const pushToken = await repo.findOne({ where: { id: tokenId } });
        if (!pushToken) {
            throw new common_1.NotFoundException('Push token not found');
        }
        if (pushToken.user_id !== userId) {
            throw new common_1.ForbiddenException('You can only deactivate your own push tokens');
        }
        pushToken.is_active = false;
        pushToken.updated_at = new Date();
        await repo.save(pushToken);
    }
    async deactivateByTokenValues(tokens) {
        if (tokens.length === 0)
            return;
        const repo = this.dataSource.getRepository(push_token_entity_1.PushToken);
        for (const token of tokens) {
            await repo
                .createQueryBuilder()
                .update(push_token_entity_1.PushToken)
                .set({ is_active: false, updated_at: new Date() })
                .where('token = :token', { token })
                .execute();
        }
    }
    async getActiveTokensForUser(userId, organizationId) {
        const repo = this.dataSource.getRepository(push_token_entity_1.PushToken);
        const tokens = await repo.find({
            where: { user_id: userId, organization_id: organizationId, is_active: true },
        });
        return tokens.map((t) => t.token);
    }
    async getActiveTokensForOrganization(organizationId) {
        const repo = this.dataSource.getRepository(push_token_entity_1.PushToken);
        const tokens = await repo.find({
            where: { organization_id: organizationId, is_active: true },
        });
        return tokens.map((t) => t.token);
    }
};
exports.PushTokenService = PushTokenService;
exports.PushTokenService = PushTokenService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], PushTokenService);
//# sourceMappingURL=push-token.service.js.map
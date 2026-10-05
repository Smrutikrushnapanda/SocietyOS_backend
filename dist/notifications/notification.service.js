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
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const notification_entity_1 = require("../database/entities/notification.entity");
const INotificationProvider_interface_1 = require("./interfaces/INotificationProvider.interface");
const push_token_service_1 = require("./push-token.service");
const crypto_1 = require("crypto");
let NotificationService = class NotificationService {
    dataSource;
    pushTokenService;
    notificationProvider;
    constructor(dataSource, pushTokenService, notificationProvider) {
        this.dataSource = dataSource;
        this.pushTokenService = pushTokenService;
        this.notificationProvider = notificationProvider;
    }
    async create(input) {
        const repo = this.dataSource.getRepository(notification_entity_1.Notification);
        const notification = repo.create({
            id: (0, crypto_1.randomUUID)(),
            organization_id: input.organizationId,
            recipient_user_id: input.recipientUserId,
            type: input.type,
            title: input.title,
            body: input.body,
            data: input.data ?? null,
            is_read: false,
            read_at: null,
            created_at: new Date(),
            updated_at: new Date(),
        });
        const saved = await repo.save(notification);
        try {
            const tokens = await this.pushTokenService.getActiveTokensForUser(input.recipientUserId, input.organizationId);
            if (tokens.length > 0) {
                const payload = {
                    title: input.title,
                    body: input.body,
                    data: input.data
                        ? Object.fromEntries(Object.entries(input.data).map(([k, v]) => [k, String(v)]))
                        : undefined,
                };
                const result = await this.notificationProvider.sendToTokens(tokens, payload);
                if (result.invalidTokens.length > 0) {
                    await this.pushTokenService.deactivateByTokenValues(result.invalidTokens);
                }
            }
        }
        catch {
        }
        return saved;
    }
    async findAllForUser(userId, organizationId) {
        return this.dataSource.getRepository(notification_entity_1.Notification).find({
            where: { recipient_user_id: userId, organization_id: organizationId },
            order: { created_at: 'DESC' },
        });
    }
    async findOneForUser(id, userId, organizationId) {
        const notification = await this.dataSource
            .getRepository(notification_entity_1.Notification)
            .findOne({ where: { id, recipient_user_id: userId, organization_id: organizationId } });
        if (!notification) {
            throw new common_1.NotFoundException('Notification not found or access denied');
        }
        return notification;
    }
    async markRead(id, userId, organizationId) {
        const notification = await this.findOneForUser(id, userId, organizationId);
        if (notification.is_read)
            return notification;
        notification.is_read = true;
        notification.read_at = new Date();
        notification.updated_at = new Date();
        return this.dataSource.getRepository(notification_entity_1.Notification).save(notification);
    }
    async markAllRead(userId, organizationId) {
        await this.dataSource
            .getRepository(notification_entity_1.Notification)
            .createQueryBuilder()
            .update(notification_entity_1.Notification)
            .set({ is_read: true, read_at: new Date(), updated_at: new Date() })
            .where('recipient_user_id = :userId AND organization_id = :organizationId AND is_read = false', { userId, organizationId })
            .execute();
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(INotificationProvider_interface_1.NOTIFICATION_PROVIDER)),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        push_token_service_1.PushTokenService, Object])
], NotificationService);
//# sourceMappingURL=notification.service.js.map
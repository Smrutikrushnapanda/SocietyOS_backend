"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MockNotificationProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockNotificationProvider = void 0;
const common_1 = require("@nestjs/common");
let MockNotificationProvider = MockNotificationProvider_1 = class MockNotificationProvider {
    logger = new common_1.Logger(MockNotificationProvider_1.name);
    sentMessages = [];
    async sendToTokens(tokens, payload) {
        this.sentMessages.push({ tokens, payload });
        this.logger.log(`[MOCK] Would send "${payload.title}" to ${tokens.length} token(s)`);
        return { successCount: tokens.length, failureCount: 0, invalidTokens: [] };
    }
};
exports.MockNotificationProvider = MockNotificationProvider;
exports.MockNotificationProvider = MockNotificationProvider = MockNotificationProvider_1 = __decorate([
    (0, common_1.Injectable)()
], MockNotificationProvider);
//# sourceMappingURL=mock-notification.provider.js.map
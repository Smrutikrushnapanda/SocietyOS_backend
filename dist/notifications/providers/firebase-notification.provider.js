"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var FirebaseNotificationProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirebaseNotificationProvider = void 0;
const common_1 = require("@nestjs/common");
const app_1 = require("firebase-admin/app");
const messaging_1 = require("firebase-admin/messaging");
let FirebaseNotificationProvider = FirebaseNotificationProvider_1 = class FirebaseNotificationProvider {
    logger = new common_1.Logger(FirebaseNotificationProvider_1.name);
    messaging = null;
    onModuleInit() {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
        const rawKey = process.env.FIREBASE_PRIVATE_KEY;
        if (!projectId || !clientEmail || !rawKey) {
            this.logger.warn('Firebase Admin credentials not fully configured — FCM delivery disabled.');
            return;
        }
        try {
            const privateKey = rawKey.replace(/\\n/g, '\n');
            const app = (0, app_1.getApps)().length > 0
                ? (0, app_1.getApp)()
                : (0, app_1.initializeApp)({
                    credential: (0, app_1.cert)({ projectId, clientEmail, privateKey }),
                });
            this.messaging = (0, messaging_1.getMessaging)(app);
            this.logger.log('Firebase Admin initialized (v14 modular API).');
        }
        catch (err) {
            this.logger.error('Firebase Admin initialization failed:', err.message);
        }
    }
    async sendToTokens(tokens, payload) {
        if (!this.messaging || tokens.length === 0) {
            return { successCount: 0, failureCount: tokens.length, invalidTokens: [] };
        }
        const message = {
            tokens,
            notification: { title: payload.title, body: payload.body },
            data: payload.data ?? {},
        };
        try {
            const response = await this.messaging.sendEachForMulticast(message);
            const invalidTokens = [];
            response.responses.forEach((r, idx) => {
                if (!r.success) {
                    const code = r.error?.code ?? '';
                    if (code === 'messaging/registration-token-not-registered' ||
                        code === 'messaging/invalid-registration-token') {
                        invalidTokens.push(tokens[idx]);
                    }
                }
            });
            return {
                successCount: response.successCount,
                failureCount: response.failureCount,
                invalidTokens,
            };
        }
        catch (err) {
            this.logger.error('FCM send failed', err.message);
            return { successCount: 0, failureCount: tokens.length, invalidTokens: [] };
        }
    }
};
exports.FirebaseNotificationProvider = FirebaseNotificationProvider;
exports.FirebaseNotificationProvider = FirebaseNotificationProvider = FirebaseNotificationProvider_1 = __decorate([
    (0, common_1.Injectable)()
], FirebaseNotificationProvider);
//# sourceMappingURL=firebase-notification.provider.js.map
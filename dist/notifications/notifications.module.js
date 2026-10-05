"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsModule = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../database/database.module");
const organization_module_1 = require("../organization/organization.module");
const notification_service_1 = require("./notification.service");
const push_token_service_1 = require("./push-token.service");
const notification_controller_1 = require("./notification.controller");
const push_token_controller_1 = require("./push-token.controller");
const firebase_notification_provider_1 = require("./providers/firebase-notification.provider");
const INotificationProvider_interface_1 = require("./interfaces/INotificationProvider.interface");
let NotificationsModule = class NotificationsModule {
};
exports.NotificationsModule = NotificationsModule;
exports.NotificationsModule = NotificationsModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, organization_module_1.OrganizationModule],
        providers: [
            push_token_service_1.PushTokenService,
            {
                provide: INotificationProvider_interface_1.NOTIFICATION_PROVIDER,
                useClass: firebase_notification_provider_1.FirebaseNotificationProvider,
            },
            notification_service_1.NotificationService,
        ],
        controllers: [notification_controller_1.NotificationController, push_token_controller_1.PushTokenController],
        exports: [notification_service_1.NotificationService, push_token_service_1.PushTokenService],
    })
], NotificationsModule);
//# sourceMappingURL=notifications.module.js.map
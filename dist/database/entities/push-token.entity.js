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
exports.PushToken = exports.PushTokenPlatform = void 0;
const typeorm_1 = require("typeorm");
var PushTokenPlatform;
(function (PushTokenPlatform) {
    PushTokenPlatform["WEB"] = "WEB";
    PushTokenPlatform["ANDROID"] = "ANDROID";
    PushTokenPlatform["IOS"] = "IOS";
})(PushTokenPlatform || (exports.PushTokenPlatform = PushTokenPlatform = {}));
let PushToken = class PushToken {
    id;
    user_id;
    organization_id;
    token;
    platform;
    is_active;
    last_seen_at;
    created_at;
    updated_at;
};
exports.PushToken = PushToken;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], PushToken.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], PushToken.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], PushToken.prototype, "organization_id", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], PushToken.prototype, "token", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PushTokenPlatform,
        default: PushTokenPlatform.WEB,
    }),
    __metadata("design:type", String)
], PushToken.prototype, "platform", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], PushToken.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], PushToken.prototype, "last_seen_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], PushToken.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], PushToken.prototype, "updated_at", void 0);
exports.PushToken = PushToken = __decorate([
    (0, typeorm_1.Entity)('push_tokens'),
    (0, typeorm_1.Unique)(['user_id', 'token'])
], PushToken);
//# sourceMappingURL=push-token.entity.js.map
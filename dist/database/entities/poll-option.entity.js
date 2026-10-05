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
exports.PollOption = void 0;
const typeorm_1 = require("typeorm");
const poll_entity_1 = require("./poll.entity");
const resident_entity_1 = require("./resident.entity");
let PollOption = class PollOption {
    id;
    poll_id;
    organization_id;
    option_text;
    display_order;
    created_at;
    poll;
    resident;
};
exports.PollOption = PollOption;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], PollOption.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], PollOption.prototype, "poll_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], PollOption.prototype, "organization_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], PollOption.prototype, "option_text", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], PollOption.prototype, "display_order", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], PollOption.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => poll_entity_1.Poll),
    __metadata("design:type", poll_entity_1.Poll)
], PollOption.prototype, "poll", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => resident_entity_1.Resident),
    __metadata("design:type", resident_entity_1.Resident)
], PollOption.prototype, "resident", void 0);
exports.PollOption = PollOption = __decorate([
    (0, typeorm_1.Entity)()
], PollOption);
//# sourceMappingURL=poll-option.entity.js.map
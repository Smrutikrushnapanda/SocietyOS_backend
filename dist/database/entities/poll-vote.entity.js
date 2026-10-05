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
exports.PollVote = void 0;
const typeorm_1 = require("typeorm");
const poll_option_entity_1 = require("./poll-option.entity");
const resident_entity_1 = require("./resident.entity");
let PollVote = class PollVote {
    id;
    poll_id;
    option_id;
    resident_id;
    organization_id;
    created_at;
    option;
    resident;
};
exports.PollVote = PollVote;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], PollVote.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], PollVote.prototype, "poll_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], PollVote.prototype, "option_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], PollVote.prototype, "resident_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], PollVote.prototype, "organization_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], PollVote.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => poll_option_entity_1.PollOption),
    __metadata("design:type", poll_option_entity_1.PollOption)
], PollVote.prototype, "option", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => resident_entity_1.Resident),
    __metadata("design:type", resident_entity_1.Resident)
], PollVote.prototype, "resident", void 0);
exports.PollVote = PollVote = __decorate([
    (0, typeorm_1.Entity)()
], PollVote);
//# sourceMappingURL=poll-vote.entity.js.map
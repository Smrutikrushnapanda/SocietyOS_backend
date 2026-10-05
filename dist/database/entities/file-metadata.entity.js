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
exports.FileMetadata = void 0;
const typeorm_1 = require("typeorm");
let FileMetadata = class FileMetadata {
    id;
    organization_id;
    uploaded_by;
    original_filename;
    stored_key;
    mime_type;
    size_bytes;
    storage_provider;
    is_active;
    created_at;
};
exports.FileMetadata = FileMetadata;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], FileMetadata.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], FileMetadata.prototype, "organization_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], FileMetadata.prototype, "uploaded_by", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], FileMetadata.prototype, "original_filename", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 512 }),
    __metadata("design:type", String)
], FileMetadata.prototype, "stored_key", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], FileMetadata.prototype, "mime_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], FileMetadata.prototype, "size_bytes", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, default: 'LOCAL' }),
    __metadata("design:type", String)
], FileMetadata.prototype, "storage_provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], FileMetadata.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], FileMetadata.prototype, "created_at", void 0);
exports.FileMetadata = FileMetadata = __decorate([
    (0, typeorm_1.Entity)('file_metadata')
], FileMetadata);
//# sourceMappingURL=file-metadata.entity.js.map
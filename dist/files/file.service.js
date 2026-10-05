"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const file_metadata_entity_1 = require("../database/entities/file-metadata.entity");
const IStorageProvider_interface_1 = require("./interfaces/IStorageProvider.interface");
const crypto_1 = require("crypto");
const path = __importStar(require("path"));
const audit_service_1 = require("../audit/audit.service");
const audit_enums_1 = require("../audit/audit.enums");
const audit_context_1 = require("../audit/audit-context");
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
let FileService = class FileService {
    dataSource;
    storageProvider;
    auditService;
    constructor(dataSource, storageProvider, auditService) {
        this.dataSource = dataSource;
        this.storageProvider = storageProvider;
        this.auditService = auditService;
    }
    buildAuditOptions(passed, entityOrganizationId, actorUserId) {
        return {
            orgContext: (passed?.orgContext ?? null),
            actorUserId: passed?.actorUserId ?? actorUserId ?? null,
            entityOrganizationId: passed?.entityOrganizationId ?? entityOrganizationId ?? null,
            request: passed?.request,
        };
    }
    emitAudit(action, entityType, entityId, oldValues, newValues, options) {
        const opts = this.buildAuditOptions(options, newValues?.organization_id ?? oldValues?.organization_id ?? options?.entityOrganizationId ?? null, options?.actorUserId ?? null);
        const ctx = (0, audit_context_1.resolveAuditContext)({ orgContext: opts.orgContext, actorUserId: opts.actorUserId ?? undefined, entityOrganizationId: opts.entityOrganizationId ?? undefined });
        const meta = (0, audit_context_1.extractRequestMeta)(opts.request);
        void (0, audit_context_1.recordAudit)(this.auditService, { ...ctx, action, entity_type: entityType, entity_id: entityId, old_values: oldValues, new_values: newValues, ...meta });
    }
    async upload(organizationId, uploadedBy, originalFilename, mimeType, buffer, auditOptions) {
        if (!ALLOWED_MIME_TYPES.has(mimeType)) {
            throw new common_1.BadRequestException(`MIME type not allowed: ${mimeType}`);
        }
        if (buffer.length > MAX_SIZE_BYTES) {
            throw new common_1.BadRequestException('File exceeds maximum allowed size of 10 MB');
        }
        const ext = path.extname(originalFilename).toLowerCase().replace(/[^a-z0-9.]/g, '');
        const storedKey = `${(0, crypto_1.randomUUID)()}${ext}`;
        const stored = await this.storageProvider.store(storedKey, buffer, mimeType);
        const repo = this.dataSource.getRepository(file_metadata_entity_1.FileMetadata);
        const metadata = repo.create({
            id: (0, crypto_1.randomUUID)(),
            organization_id: organizationId,
            uploaded_by: uploadedBy,
            original_filename: path.basename(originalFilename),
            stored_key: stored.key,
            mime_type: mimeType,
            size_bytes: stored.sizeBytes,
            storage_provider: stored.provider,
            is_active: true,
            created_at: new Date(),
        });
        const saved = await repo.save(metadata);
        const ctx = (0, audit_context_1.resolveAuditContext)({
            orgContext: auditOptions?.orgContext ?? { userId: uploadedBy, organizationId },
            actorUserId: auditOptions?.actorUserId ?? uploadedBy,
            entityOrganizationId: organizationId,
        });
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...ctx,
            action: audit_enums_1.AuditAction.UPLOAD,
            entity_type: audit_enums_1.AuditEntityType.FILE,
            entity_id: saved.id ?? null,
            old_values: null,
            new_values: (0, audit_context_1.toSnapshot)(saved),
            ...(0, audit_context_1.extractRequestMeta)(auditOptions?.request),
        });
        return saved;
    }
    async retrieve(id, organizationId) {
        const metadata = await this.findAuthorized(id, organizationId);
        const buffer = await this.storageProvider.retrieve(metadata.stored_key);
        return { buffer, metadata };
    }
    async remove(id, organizationId, userId, auditOptions) {
        const metadata = await this.findAuthorized(id, organizationId);
        if (metadata.uploaded_by !== userId) {
            throw new common_1.ForbiddenException('You can only delete files you uploaded');
        }
        const oldValues = (0, audit_context_1.toSnapshot)(metadata);
        metadata.is_active = false;
        await this.dataSource.getRepository(file_metadata_entity_1.FileMetadata).save(metadata);
        const ctx = (0, audit_context_1.resolveAuditContext)({
            orgContext: auditOptions?.orgContext ?? { userId, organizationId },
            actorUserId: auditOptions?.actorUserId ?? userId,
            entityOrganizationId: organizationId,
        });
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...ctx,
            action: audit_enums_1.AuditAction.DELETE,
            entity_type: audit_enums_1.AuditEntityType.FILE,
            entity_id: metadata.id ?? null,
            old_values: oldValues,
            new_values: null,
            ...(0, audit_context_1.extractRequestMeta)(auditOptions?.request),
        });
    }
    async findAuthorized(id, organizationId) {
        const metadata = await this.dataSource
            .getRepository(file_metadata_entity_1.FileMetadata)
            .findOne({ where: { id, organization_id: organizationId, is_active: true } });
        if (!metadata) {
            throw new common_1.NotFoundException('File not found or access denied');
        }
        return metadata;
    }
};
exports.FileService = FileService;
exports.FileService = FileService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(IStorageProvider_interface_1.STORAGE_PROVIDER)),
    __metadata("design:paramtypes", [typeorm_1.DataSource, Object, audit_service_1.AuditService])
], FileService);
//# sourceMappingURL=file.service.js.map
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditSanitizer = exports.AUDIT_CIRCULAR = exports.AUDIT_TRUNCATED = exports.AUDIT_REDACTED = void 0;
const common_1 = require("@nestjs/common");
const audit_enums_1 = require("./audit.enums");
exports.AUDIT_REDACTED = '[REDACTED]';
exports.AUDIT_TRUNCATED = '[TRUNCATED]';
exports.AUDIT_CIRCULAR = '[CIRCULAR]';
const MAX_DEPTH = 6;
const MAX_ARRAY_LENGTH = 50;
const ALWAYS_DENIED_KEY_PATTERNS = [
    /otp/i,
    /refresh_?token/i,
    /refreshtokenid/i,
    /^token$/i,
    /push_?token/i,
    /fcm_?token/i,
    /^mobilenumber$/i,
    /password/i,
    /secret/i,
];
function isDeniedKey(key, entityType) {
    if (ALWAYS_DENIED_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
        return true;
    }
    if (key.toLowerCase() === 'mobile' &&
        entityType !== audit_enums_1.AuditEntityType.VISITOR) {
        return true;
    }
    return false;
}
let AuditSanitizer = class AuditSanitizer {
    sanitizeSnapshot(entityType, input) {
        if (input === null || input === undefined) {
            return null;
        }
        const result = this.cloneAndSanitize(input, entityType, 0, new WeakSet());
        if (result === null || result === undefined || typeof result !== 'object') {
            return null;
        }
        return result;
    }
    cloneAndSanitize(value, entityType, depth, seen) {
        if (value === undefined) {
            return undefined;
        }
        if (value === null) {
            return null;
        }
        const valueType = typeof value;
        if (valueType === 'function' ||
            valueType === 'symbol' ||
            valueType === 'bigint') {
            return undefined;
        }
        if (valueType !== 'object') {
            return value;
        }
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (depth > MAX_DEPTH) {
            return exports.AUDIT_TRUNCATED;
        }
        const objectValue = value;
        if (seen.has(objectValue)) {
            return exports.AUDIT_CIRCULAR;
        }
        seen.add(objectValue);
        if (Array.isArray(value)) {
            const out = [];
            const end = Math.min(value.length, MAX_ARRAY_LENGTH);
            for (let i = 0; i < end; i++) {
                const sanitized = this.cloneAndSanitize(value[i], entityType, depth + 1, seen);
                if (sanitized !== undefined) {
                    out.push(sanitized);
                }
            }
            if (value.length > MAX_ARRAY_LENGTH) {
                out.push(exports.AUDIT_TRUNCATED);
            }
            return out;
        }
        const out = {};
        for (const [key, val] of Object.entries(value)) {
            if (isDeniedKey(key, entityType)) {
                out[key] = exports.AUDIT_REDACTED;
                continue;
            }
            const sanitized = this.cloneAndSanitize(val, entityType, depth + 1, seen);
            if (sanitized !== undefined) {
                out[key] = sanitized;
            }
        }
        return out;
    }
};
exports.AuditSanitizer = AuditSanitizer;
exports.AuditSanitizer = AuditSanitizer = __decorate([
    (0, common_1.Injectable)()
], AuditSanitizer);
//# sourceMappingURL=audit-sanitizer.js.map
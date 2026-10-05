"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequireOrganizationId = exports.RequireSocietyId = exports.RequirePermission = exports.REQUIRED_ORGANIZATION_ID_KEY = exports.REQUIRED_SOCIETY_ID_KEY = exports.REQUIRED_PERMISSION_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.REQUIRED_PERMISSION_KEY = 'requiredPermission';
exports.REQUIRED_SOCIETY_ID_KEY = 'requiredSocietyId';
exports.REQUIRED_ORGANIZATION_ID_KEY = 'requiredOrganizationId';
const RequirePermission = (permission) => (0, common_1.SetMetadata)(exports.REQUIRED_PERMISSION_KEY, permission);
exports.RequirePermission = RequirePermission;
const RequireSocietyId = (societyId) => (0, common_1.SetMetadata)(exports.REQUIRED_SOCIETY_ID_KEY, societyId);
exports.RequireSocietyId = RequireSocietyId;
const RequireOrganizationId = (organizationId) => (0, common_1.SetMetadata)(exports.REQUIRED_ORGANIZATION_ID_KEY, organizationId);
exports.RequireOrganizationId = RequireOrganizationId;
//# sourceMappingURL=require-permission.decorator.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequireOrganizationId = exports.REQUIRED_ORGANIZATION_ID_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.REQUIRED_ORGANIZATION_ID_KEY = 'requiredOrganizationId';
const RequireOrganizationId = (organizationId) => (0, common_1.SetMetadata)(exports.REQUIRED_ORGANIZATION_ID_KEY, organizationId);
exports.RequireOrganizationId = RequireOrganizationId;
//# sourceMappingURL=require-organization-id.decorator.js.map
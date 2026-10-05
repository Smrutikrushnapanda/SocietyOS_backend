"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantIsolationMiddleware = TenantIsolationMiddleware;
function TenantIsolationMiddleware(req, res, next) {
    req.societyId = null;
    res.locals.societyId = req.societyId;
    next();
}
//# sourceMappingURL=tenant-isolation.middleware.js.map
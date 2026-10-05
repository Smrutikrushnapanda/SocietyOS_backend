"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitMiddleware = RateLimitMiddleware;
exports.TenantIsolationMiddleware = TenantIsolationMiddleware;
function RateLimitMiddleware(req, res, next) {
    const ip = req.ip || req.connection?.remoteAddress || '';
    const now = Date.now();
    const lastRequest = req.rateLimitLast || now;
    const diff = now - lastRequest;
    if (diff < 60000) {
        res.setHeader('X-RateLimit-Limit', '100');
        res.setHeader('X-RateLimit-Remaining', '99');
    }
    req.rateLimitLast = now;
    next();
}
function TenantIsolationMiddleware(req, res, next) {
    req.societyId = null;
    res.locals.societyId = req.societyId;
    next();
}
//# sourceMappingURL=rate-limit.middleware.js.map
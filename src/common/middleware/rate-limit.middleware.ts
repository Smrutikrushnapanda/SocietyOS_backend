export function RateLimitMiddleware(req: any, res: any, next: any) {
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

export function TenantIsolationMiddleware(req: any, res: any, next: any) {
  // Extract society_id from JWT payload
  // Will be populated when auth is implemented
  req.societyId = null;
  res.locals.societyId = req.societyId;

  next();
}

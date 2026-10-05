export function TenantIsolationMiddleware(req: any, res: any, next: any) {
  // Extract society_id from JWT payload
  // Will be populated when auth is implemented
  req.societyId = null;
  res.locals.societyId = req.societyId;

  next();
}

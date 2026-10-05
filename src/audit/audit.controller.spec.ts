// The controller (via AuthGuard) imports @nestjs/jwt, which is ESM-only. Stub
// it so this focused unit spec can load the controller under ts-jest (CJS).
jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuditController } from './audit.controller';

const orgId = 'org-aaaa-0001';
const otherOrgId = 'org-bbbb-0002';

function build() {
  const service = {
    findAll: jest.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 25,
      totalPages: 0,
    }),
    findOne: jest.fn(),
  };
  const controller = new AuditController(service as any);
  return { controller, service };
}

describe('AuditController (Phase 10)', () => {
  it('findAll uses the resolved organization from orgContext', async () => {
    const { controller, service } = build();
    const req = { orgContext: { organizationId: orgId } };

    await controller.findAll(req, {});

    expect(service.findAll).toHaveBeenCalledWith(orgId, {});
  });

  it('findAll ignores a query organization_id (cannot override scope)', async () => {
    const { controller, service } = build();
    const req = { orgContext: { organizationId: orgId } };

    await controller.findAll(req, { organization_id: otherOrgId });

    expect(service.findAll).toHaveBeenCalledTimes(1);
    expect(service.findAll.mock.calls[0][0]).toBe(orgId);
  });

  it('SUPER_ADMIN reads are scoped to the resolved target organization', async () => {
    const { controller, service } = build();
    const req = {
      orgContext: {
        organizationId: orgId,
        targetOrganizationId: orgId,
        isSuperAdmin: true,
      },
    };

    await controller.findAll(req, { organization_id: otherOrgId });

    expect(service.findAll.mock.calls[0][0]).toBe(orgId);
  });

  it('findAll throws when organization context is missing', async () => {
    const { controller } = build();
    await expect(
      controller.findAll({ orgContext: {} }, {}),
    ).rejects.toThrow(ForbiddenException);
  });

  it('findOne returns the record when it belongs to the resolved org', async () => {
    const { controller, service } = build();
    service.findOne.mockResolvedValue({ id: 'audit-1' });
    const req = { orgContext: { organizationId: orgId } };

    const result = await controller.findOne(req, 'audit-1');

    expect(service.findOne).toHaveBeenCalledWith('audit-1', orgId);
    expect(result).toEqual({ id: 'audit-1' });
  });

  it('findOne throws NotFound for a cross-organization id (IDOR)', async () => {
    const { controller, service } = build();
    service.findOne.mockResolvedValue(null);
    const req = { orgContext: { organizationId: orgId } };

    await expect(controller.findOne(req, 'audit-from-other-org')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('findOne throws when organization context is missing', async () => {
    const { controller } = build();
    await expect(
      controller.findOne({ orgContext: {} }, 'audit-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('exposes no mutation endpoints (append-only / read-only)', () => {
    const proto = AuditController.prototype as any;
    expect(proto.create).toBeUndefined();
    expect(proto.update).toBeUndefined();
    expect(proto.remove).toBeUndefined();
    expect(proto.delete).toBeUndefined();
  });
});

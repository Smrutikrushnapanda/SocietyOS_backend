import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditSanitizer, AUDIT_REDACTED } from './audit-sanitizer';
import { AuditAction, AuditEntityType } from './audit.enums';

const orgId = 'org-aaaa-0001';
const otherOrgId = 'org-bbbb-0002';

function makeRepositoryMock() {
  const queryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[{ id: 'audit-1' }], 1]),
  };

  const repo = {
    create: jest.fn((dto: any) => ({ ...dto })),
    save: jest.fn(async (entity: any) => entity),
    createQueryBuilder: jest.fn(() => queryBuilder),
    findOne: jest.fn(async (opts: any) => {
      if (
        opts.where.id === 'audit-1' &&
        opts.where.target_organization_id === orgId
      ) {
        return { id: 'audit-1', target_organization_id: orgId };
      }
      return null;
    }),
  };

  return { queryBuilder, repo };
}

describe('AuditService (Phase 10)', () => {
  let repoMock: ReturnType<typeof makeRepositoryMock>['repo'];
  let queryBuilder: ReturnType<typeof makeRepositoryMock>['queryBuilder'];
  let service: AuditService;

  beforeEach(() => {
    const mocks = makeRepositoryMock();
    repoMock = mocks.repo;
    queryBuilder = mocks.queryBuilder;

    const dataSource: any = {
      getRepository: jest.fn(() => repoMock),
    };
    service = new AuditService(dataSource, new AuditSanitizer());
  });

  describe('record()', () => {
    it('inserts an audit row with sanitized snapshots', async () => {
      await service.record({
        actor_user_id: 'user-1',
        actor_organization_id: orgId,
        target_organization_id: orgId,
        action: AuditAction.CREATE,
        entity_type: AuditEntityType.NOTICE,
        entity_id: 'notice-1',
        old_values: null,
        new_values: { title: 'Hi', otp: '123456', token: 'fcm-secret' },
      });

      expect(repoMock.save).toHaveBeenCalledTimes(1);
      const saved = repoMock.save.mock.calls[0][0];
      expect(saved.action).toBe(AuditAction.CREATE);
      expect(saved.entity_type).toBe(AuditEntityType.NOTICE);
      expect(saved.old_values).toBeNull();
      expect(saved.new_values).toEqual({
        title: 'Hi',
        otp: AUDIT_REDACTED,
        token: AUDIT_REDACTED,
      });
    });

    it('uses null snapshots when sanitization fails (never raw input)', async () => {
      const failingSanitizer = {
        sanitizeSnapshot: jest.fn(() => {
          throw new Error('sanitizer failure');
        }),
      } as unknown as AuditSanitizer;
      const dataSource: any = { getRepository: jest.fn(() => repoMock) };
      const svc = new AuditService(dataSource, failingSanitizer);

      await expect(
        svc.record({
          action: AuditAction.UPDATE,
          entity_type: AuditEntityType.RESIDENT,
          old_values: { otp: 'RAW-OTP' },
          new_values: { refreshToken: 'RAW-REFRESH' },
        }),
      ).resolves.toBeUndefined();

      const saved = repoMock.save.mock.calls[0][0];
      expect(saved.old_values).toBeNull();
      expect(saved.new_values).toBeNull();
    });

    it('never throws into the business operation when the insert fails', async () => {
      repoMock.save.mockRejectedValueOnce(new Error('db down'));

      await expect(
        service.record({
          action: AuditAction.DELETE,
          entity_type: AuditEntityType.FILE,
        }),
      ).resolves.toBeUndefined();
    });

    it('sets nullable fields to null when omitted', async () => {
      await service.record({
        action: AuditAction.UPLOAD,
        entity_type: AuditEntityType.FILE,
      });
      const saved = repoMock.save.mock.calls[0][0];
      expect(saved.actor_user_id).toBeNull();
      expect(saved.actor_organization_id).toBeNull();
      expect(saved.target_organization_id).toBeNull();
      expect(saved.entity_id).toBeNull();
      expect(saved.ip_address).toBeNull();
      expect(saved.user_agent).toBeNull();
    });
  });

  describe('findAll()', () => {
    it('always scopes by target_organization_id', async () => {
      await service.findAll(orgId);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'audit.target_organization_id = :organizationId',
        { organizationId: orgId },
      );
    });

    it('applies action/entity_type/pagination filters', async () => {
      await service.findAll(orgId, {
        action: 'CREATE',
        entity_type: 'NOTICE',
        page: 2,
        limit: 10,
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.action = :action',
        { action: 'CREATE' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.entity_type = :entityType',
        { entityType: 'NOTICE' },
      );
      expect(queryBuilder.skip).toHaveBeenCalledWith(10);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('rejects an invalid action filter', async () => {
      await expect(
        service.findAll(orgId, { action: 'NOT_A_REAL_ACTION' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ignores a supplied organization_id filter (cannot override scope)', async () => {
      await service.findAll(orgId, {
        organization_id: otherOrgId,
      } as any);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'audit.target_organization_id = :organizationId',
        { organizationId: orgId },
      );
      // No additional AND clause derived from organization_id
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('throws when organization context is missing', async () => {
      await expect(service.findAll('')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne()', () => {
    it('scopes by id AND target_organization_id', async () => {
      const result = await service.findOne('audit-1', orgId);
      expect(repoMock.findOne).toHaveBeenCalledWith({
        where: { id: 'audit-1', target_organization_id: orgId },
      });
      expect(result).toEqual({ id: 'audit-1', target_organization_id: orgId });
    });

    it('returns null for a cross-organization id (IDOR prevention)', async () => {
      const result = await service.findOne('audit-1', otherOrgId);
      expect(result).toBeNull();
    });

    it('throws when organization context is missing', async () => {
      await expect(service.findOne('audit-1', '')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('append-only', () => {
    it('exposes no update/delete service methods', () => {
      expect((service as any).update).toBeUndefined();
      expect((service as any).remove).toBeUndefined();
      expect((service as any).delete).toBeUndefined();
    });
  });
});

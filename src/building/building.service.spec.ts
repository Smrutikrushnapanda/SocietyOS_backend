import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BuildingService } from './building.service';
import { OrganizationContextService } from '../organization/organization-context.service';
import { AuditService } from '../audit/audit.service';

const orgId = 'org-1-aaa';
const otherOrgId = 'org-2-bbb';
const buildingId = 'building-1-aaa';

const buildingFixture = {
  id: buildingId,
  organization_id: orgId,
  name: 'Test Building',
  isActive: true,
};

function makeRepo() {
  return {
    findOneBy: jest.fn(async (where: any) => {
      if (where.id === buildingId && where.organization_id === orgId) {
        return { ...buildingFixture };
      }
      return null;
    }),
    create: jest.fn((dto) => ({ ...dto })),
    save: jest.fn(async (e) => e),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([buildingFixture]),
      getOne: jest.fn().mockResolvedValue(buildingFixture),
    })),
  };
}

describe('BuildingService - Phase 5 Security', () => {
  let service: BuildingService;
  let orgContextService: OrganizationContextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuildingService,
        OrganizationContextService,
        {
          provide: AuditService,
          useValue: { record: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: DataSource,
          useValue: { getRepository: jest.fn(() => makeRepo()) },
        },
      ],
    }).compile();

    service = module.get<BuildingService>(BuildingService);
    orgContextService = module.get<OrganizationContextService>(
      OrganizationContextService,
    );
  });

  describe('organization isolation', () => {
    it('should create building in own organization', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue({
          userId: null,
          organizationId: orgId,
          organization_id: orgId,
          isSuperAdmin: false,
          isCrossOrganization: false,
          targetOrganizationId: null,
        } as any);

      const result = await service.create({
        organization_id: orgId,
        name: 'Test Building',
      });
      expect(result).toBeDefined();
      expect(result.organization_id).toBe(orgId);
    });

    it('should reject building creation in another organization for normal user', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue({
          userId: null,
          organizationId: orgId,
          organization_id: orgId,
          isSuperAdmin: false,
          isCrossOrganization: false,
          targetOrganizationId: null,
        } as any);

      await expect(
        service.create({ organization_id: otherOrgId, name: 'Test Building' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('SUPER_ADMIN target organization', () => {
    it('should allow SUPER_ADMIN to create building in target organization', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue({
          userId: null,
          organizationId: null,
          organization_id: null,
          isSuperAdmin: true,
          isCrossOrganization: false,
          targetOrganizationId: 'target-org',
        } as any);

      const result = await service.create({
        organization_id: 'target-org',
        name: 'Test Building',
      });
      expect(result).toBeDefined();
    });

    it('should reject SUPER_ADMIN creating building in wrong organization', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue({
          userId: null,
          organizationId: null,
          organization_id: null,
          isSuperAdmin: true,
          isCrossOrganization: false,
          targetOrganizationId: 'target-org',
        } as any);

      await expect(
        service.create({ organization_id: 'wrong-org', name: 'Test Building' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

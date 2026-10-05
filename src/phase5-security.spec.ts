import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BuildingService } from './building/building.service';
import { FloorService } from './floor/floor.service';
import { FlatService } from './flat/flat.service';
import { ResidentService } from './resident/resident.service';
import { OrganizationContextService } from './organization/organization-context.service';
import { AuditService } from './audit/audit.service';
import { Building } from './database/entities/building.entity';
import { Floor } from './database/entities/floor.entity';
import { Flat } from './database/entities/flat.entity';
import { Resident } from './database/entities/resident.entity';

// ─── Fixture UUIDs ────────────────────────────────────────────────────────────
const orgA = 'aaaaaaaa-0000-0000-0000-000000000001';
const orgB = 'bbbbbbbb-0000-0000-0000-000000000002';

const buildingAId = 'aaaaaaaa-0000-0000-0000-000000000010';
const buildingBId = 'bbbbbbbb-0000-0000-0000-000000000020';

const floorAId = 'aaaaaaaa-0000-0000-0000-000000000100';
const floorBId = 'bbbbbbbb-0000-0000-0000-000000000200';

const flatAId = 'aaaaaaaa-0000-0000-0000-000000001000';
const flatBId = 'bbbbbbbb-0000-0000-0000-000000002000';

const residentAId = 'aaaaaaaa-0000-0000-0000-000000010000';
const residentBId = 'bbbbbbbb-0000-0000-0000-000000020000';

const userAId = 'aaaaaaaa-0000-0000-0000-000000100000';
const userBId = 'bbbbbbbb-0000-0000-0000-000000200000';

// ─── Fixture Objects ──────────────────────────────────────────────────────────
const buildingA: Partial<Building> = {
  id: buildingAId,
  organization_id: orgA,
  name: 'Building A',
  isActive: true,
};
const buildingB: Partial<Building> = {
  id: buildingBId,
  organization_id: orgB,
  name: 'Building B',
  isActive: true,
};

const floorA: Partial<Floor> = {
  id: floorAId,
  organization_id: orgA,
  building_id: buildingAId,
  floor_number: 1,
  isActive: true,
};
const floorB: Partial<Floor> = {
  id: floorBId,
  organization_id: orgB,
  building_id: buildingBId,
  floor_number: 1,
  isActive: true,
};

const flatA: Partial<Flat> = {
  id: flatAId,
  organization_id: orgA,
  building_id: buildingAId,
  floor_id: floorAId,
  flat_identifier: 'A-101',
  isActive: true,
};
const flatB: Partial<Flat> = {
  id: flatBId,
  organization_id: orgB,
  building_id: buildingBId,
  floor_id: floorBId,
  flat_identifier: 'B-101',
  isActive: true,
};

const residentA: Partial<Resident> = {
  id: residentAId,
  user_id: userAId,
  organization_id: orgA,
  flat_id: flatAId,
  kyc_status: 'PENDING',
  isActive: true,
  app_access_status: false,
};
const residentB: Partial<Resident> = {
  id: residentBId,
  user_id: userBId,
  organization_id: orgB,
  flat_id: flatBId,
  kyc_status: 'PENDING',
  isActive: true,
  app_access_status: false,
};

const userA = { id: userAId, organization_id: orgA };
const userB = { id: userBId, organization_id: orgB };

// ─── Query-aware findOneBy ────────────────────────────────────────────────────
/**
 * Matches a fixture against a `where` object by checking every key in `where`
 * against the fixture. Returns the fixture only when ALL supplied keys match.
 */
function matchAll<T extends object>(fixture: T, where: Partial<T>): boolean {
  return Object.keys(where).every(
    (k) => (fixture as any)[k] === (where as any)[k],
  );
}

function makeFindOneBy<T extends object>(fixtures: T[]) {
  return jest.fn(async (where: Partial<T>) => {
    return fixtures.find((f) => matchAll(f, where)) ?? null;
  });
}

// ─── Per-entity repository factories ─────────────────────────────────────────
function makeQueryBuilder(rows: any[] = []) {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(rows),
    getOne: jest.fn().mockResolvedValue(rows[0] ?? null),
  };
  return qb;
}

function makeBuildingRepo() {
  const fixtures = [buildingA, buildingB] as Building[];
  return {
    findOneBy: makeFindOneBy(fixtures),
    create: jest.fn((dto) => ({ ...dto })),
    save: jest.fn(async (e) => e),
    createQueryBuilder: jest.fn(() => makeQueryBuilder(fixtures)),
  };
}

function makeFloorRepo() {
  const fixtures = [floorA, floorB] as Floor[];
  return {
    findOneBy: makeFindOneBy(fixtures),
    create: jest.fn((dto) => ({ ...dto })),
    save: jest.fn(async (e) => e),
    createQueryBuilder: jest.fn(() => makeQueryBuilder(fixtures)),
  };
}

function makeFlatRepo() {
  const fixtures = [flatA, flatB] as Flat[];
  return {
    findOneBy: makeFindOneBy(fixtures),
    create: jest.fn((dto) => ({ ...dto })),
    save: jest.fn(async (e) => e),
    createQueryBuilder: jest.fn(() => makeQueryBuilder(fixtures)),
  };
}

function makeResidentRepo() {
  const fixtures = [residentA, residentB] as Resident[];
  return {
    findOneBy: makeFindOneBy(fixtures),
    create: jest.fn((dto) => ({ ...dto })),
    save: jest.fn(async (e) => e),
    createQueryBuilder: jest.fn(() => makeQueryBuilder(fixtures)),
  };
}

function makeUserRepo() {
  const fixtures = [userA, userB];
  return {
    findOneBy: makeFindOneBy(fixtures),
    create: jest.fn((dto) => ({ ...dto })),
    save: jest.fn(async (e) => e),
  };
}

// ─── DataSource factory ───────────────────────────────────────────────────────
/**
 * Routes getRepository() to the correct per-entity mock based on the entity
 * class or string name passed by the production services.
 */
function makeDataSource() {
  const buildingRepo = makeBuildingRepo();
  const floorRepo = makeFloorRepo();
  const flatRepo = makeFlatRepo();
  const residentRepo = makeResidentRepo();
  const userRepo = makeUserRepo();

  return {
    getRepository: jest.fn((entity) => {
      const name = typeof entity === 'string' ? entity : (entity?.name ?? '');
      switch (name) {
        case 'Building':
          return buildingRepo;
        case 'Floor':
          return floorRepo;
        case 'Flat':
          return flatRepo;
        case 'Resident':
          return residentRepo;
        case 'User':
          return userRepo;
        default:
          // Fallback: return a no-op repo so unknown lookups return null
          return {
            findOneBy: jest.fn().mockResolvedValue(null),
            create: jest.fn((dto) => ({ ...dto })),
            save: jest.fn(async (e) => e),
            createQueryBuilder: jest.fn(() => makeQueryBuilder()),
          };
      }
    }),
  };
}

// ─── orgContext helpers ───────────────────────────────────────────────────────
// Services cast the return value to `any` and read snake_case `organization_id`
// as well as camelCase `targetOrganizationId` and `isSuperAdmin`.
function orgContextFor(orgId: string) {
  return {
    userId: null,
    // Services read orgContext.organization_id (snake_case)
    organization_id: orgId,
    // Services also read orgContext.organizationId (camelCase) — include both
    organizationId: orgId,
    isSuperAdmin: false,
    isCrossOrganization: false,
    targetOrganizationId: null,
  } as any;
}

function superAdminContext(targetOrgId: string | null = null) {
  return {
    userId: null,
    organization_id: null,
    organizationId: null,
    isSuperAdmin: true,
    isCrossOrganization: false,
    targetOrganizationId: targetOrgId,
  } as any;
}

// ─── Test Suite ───────────────────────────────────────────────────────────────
describe('Phase 5 Security Tests - All 23 Scenarios', () => {
  let buildingService: BuildingService;
  let floorService: FloorService;
  let flatService: FlatService;
  let residentService: ResidentService;
  let orgContextService: OrganizationContextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuildingService,
        FloorService,
        FlatService,
        ResidentService,
        OrganizationContextService,
        {
          provide: AuditService,
          useValue: { record: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: DataSource, useValue: makeDataSource() },
      ],
    }).compile();

    buildingService = module.get(BuildingService);
    floorService = module.get(FloorService);
    flatService = module.get(FlatService);
    residentService = module.get(ResidentService);
    orgContextService = module.get(OrganizationContextService);
  });

  // ── Building ────────────────────────────────────────────────────────────────

  describe('Building', () => {
    it('1. Own-org admin can create a building in their organization', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue(orgContextFor(orgA));

      const result = await buildingService.create({
        organization_id: orgA,
        name: 'New Building A',
      });
      expect(result).toBeDefined();
      expect(result.organization_id).toBe(orgA);
    });

    it('2. Non-admin cannot create a building in another organization', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue(orgContextFor(orgA));

      await expect(
        buildingService.create({
          organization_id: orgB,
          name: 'Rogue Building',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('3. Own-org admin can update their building', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue(orgContextFor(orgA));

      const result = await buildingService.update(buildingAId, {
        name: 'Updated A',
      });
      expect(result).toBeDefined();
    });

    it('4. Non-admin cannot update another org building', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue(orgContextFor(orgA));

      await expect(
        buildingService.update(buildingBId, { name: 'Rogue Update' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('5. Own-org admin can soft-delete their building', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue(orgContextFor(orgA));

      const result = await buildingService.remove(buildingAId);
      expect(result.isActive).toBe(false);
    });

    it('6. Non-admin cannot delete another org building', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue(orgContextFor(orgA));

      await expect(buildingService.remove(buildingBId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── Floor ───────────────────────────────────────────────────────────────────

  describe('Floor', () => {
    it('7. Own-org admin can create a floor in their building', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue(orgContextFor(orgA));

      // floor_number 99 does not exist in fixtures → no duplicate
      const result = await floorService.create({
        organization_id: orgA,
        building_id: buildingAId,
        floor_number: 99,
      });
      expect(result).toBeDefined();
      expect(result.organization_id).toBe(orgA);
    });

    it('8. Creating a floor in another org building is rejected', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue(orgContextFor(orgA));

      // buildingBId belongs to orgB, but we supply orgA → building lookup returns null
      await expect(
        floorService.create({
          organization_id: orgA,
          building_id: buildingBId,
          floor_number: 99,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('9. Duplicate floor number in same building is rejected', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue(orgContextFor(orgA));

      // floor_number 1 already exists in floorA fixture for buildingAId
      await expect(
        floorService.create({
          organization_id: orgA,
          building_id: buildingAId,
          floor_number: 1,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('10. Own-org admin can update their floor', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue(orgContextFor(orgA));

      const result = await floorService.update(floorAId, { name: 'Ground' });
      expect(result).toBeDefined();
    });

    it('11. Non-admin cannot update another org floor', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue(orgContextFor(orgA));

      await expect(
        floorService.update(floorBId, { name: 'Rogue' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── Flat ────────────────────────────────────────────────────────────────────

  describe('Flat', () => {
    it('12. Own-org admin can create a flat in their building/floor', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue(orgContextFor(orgA));

      // flat_identifier 'A-999' does not exist → no duplicate
      const result = await flatService.create({
        organization_id: orgA,
        building_id: buildingAId,
        floor_id: floorAId,
        flat_identifier: 'A-999',
      });
      expect(result).toBeDefined();
      expect(result.organization_id).toBe(orgA);
    });

    it('13. Creating a flat with another org floor is rejected', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue(orgContextFor(orgA));

      // floorBId belongs to orgB → floor lookup with orgA returns null
      await expect(
        flatService.create({
          organization_id: orgA,
          building_id: buildingAId,
          floor_id: floorBId,
          flat_identifier: 'A-999',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('14. Duplicate flat identifier in same org/building is rejected', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue(orgContextFor(orgA));

      // 'A-101' already exists in flatA fixture
      await expect(
        flatService.create({
          organization_id: orgA,
          building_id: buildingAId,
          floor_id: floorAId,
          flat_identifier: 'A-101',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('15. Own-org admin can update their flat', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue(orgContextFor(orgA));

      const result = await flatService.update(flatAId, { flat_type: '2BHK' });
      expect(result).toBeDefined();
    });

    it('16. Non-admin cannot update another org flat', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue(orgContextFor(orgA));

      await expect(
        flatService.update(flatBId, { flat_type: 'Rogue' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── Resident ─────────────────────────────────────────────────────────────────

  describe('Resident', () => {
    it('17. Own-org admin can create a resident with a valid flat', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue(orgContextFor(orgA));

      const result = await residentService.createResident({
        user_id: userAId,
        organization_id: orgA,
        flat_id: flatAId,
      });
      expect(result).toBeDefined();
      expect(result.organization_id).toBe(orgA);
    });

    it('18. Creating a resident with a cross-org flat is rejected', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue(orgContextFor(orgA));

      // flatBId belongs to orgB → flat lookup with orgA returns null
      await expect(
        residentService.createResident({
          user_id: userAId,
          organization_id: orgA,
          flat_id: flatBId,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('19. Non-admin cannot create a resident in another organization', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue(orgContextFor(orgA));

      await expect(
        residentService.createResident({
          user_id: userAId,
          organization_id: orgB,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('20. Own-org admin can assign a flat to their resident', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue(orgContextFor(orgA));

      const result = await residentService.assignFlat(residentAId, flatAId);
      expect(result).toBeDefined();
      expect(result.flat_id).toBe(flatAId);
    });

    it('21. Assigning a cross-org flat to a resident is rejected', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue(orgContextFor(orgA));

      // flatBId belongs to orgB → flat lookup with orgA returns null
      await expect(
        residentService.assignFlat(residentAId, flatBId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('22. Own-org admin can enable app access for their resident', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue(orgContextFor(orgA));

      const result = await residentService.assignAppAccess(residentAId, true);
      expect(result.app_access_status).toBe(true);
    });

    it('23. Non-admin cannot modify app access for another org resident', async () => {
      jest
        .spyOn(orgContextService, 'getCurrentOrganization')
        .mockResolvedValue(orgContextFor(orgA));

      // residentBId belongs to orgB → resident lookup with orgA returns null
      await expect(
        residentService.assignAppAccess(residentBId, true),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationGuard } from './organization.guard';
import { DataSource } from 'typeorm';
import { OrganizationContextService } from './organization-context.service';

describe('OrganizationGuard', () => {
  let guard: OrganizationGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationGuard,
        OrganizationContextService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<OrganizationGuard>(OrganizationGuard);
  });

  describe('organization guard', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });
  });
});

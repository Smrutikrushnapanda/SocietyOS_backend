import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { OrganizationContextService } from './organization-context.service';

describe('OrganizationContextService', () => {
  let service: OrganizationContextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationContextService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              findOneBy: jest.fn(),
              createQueryBuilder: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn(),
                getOne: jest.fn(),
              }),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OrganizationContextService>(
      OrganizationContextService,
    );
  });

  describe('organization context', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });
});

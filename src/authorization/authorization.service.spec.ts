import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AuthorizationService } from './authorization.service';

describe('AuthorizationService', () => {
  let service: AuthorizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);
  });

  describe('authorization service', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });
});

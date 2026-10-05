import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should report the service as running', () => {
      const status = appController.getStatus();

      expect(status.service).toBe('SocietyOS Backend');
      expect(status.status).toBe('running');
      expect(status.message).toContain('running successfully');
    });
  });
});

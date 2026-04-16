import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseService } from './database/database.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: DatabaseService,
          useValue: {
            health: () => ({
              database: 'sqlite',
              categories: 4,
            }),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return health payload', () => {
      expect(appController.getHello()).toEqual({
        service: 'towercrane-for-uiux-server',
        status: 'ok',
        storage: {
          database: 'sqlite',
          categories: 4,
        },
      });
    });
  });
});

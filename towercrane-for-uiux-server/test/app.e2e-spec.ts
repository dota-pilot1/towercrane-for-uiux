import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request, { type Response } from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect((response: Response) => {
        const body = response.body as {
          status: string;
          service: string;
        };

        expect(body.status).toBe('ok');
        expect(body.service).toBe('towercrane-for-uiux-server');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});

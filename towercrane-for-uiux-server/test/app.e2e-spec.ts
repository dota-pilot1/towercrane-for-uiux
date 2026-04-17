import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request, { type Response } from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let databaseFile: string;
  let httpApp: App;

  beforeEach(async () => {
    databaseFile = join('/tmp', `towercrane-test-${randomUUID()}.sqlite`);
    process.env.DATABASE_FILE = databaseFile;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    httpApp = app.getHttpAdapter().getInstance();
  });

  it('/ (GET)', () => {
    return request(httpApp)
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

  it('supports signup, session lookup, and user-scoped catalog writes', async () => {
    const signupResponse = await request(httpApp)
      .post('/api/auth/signup')
      .send({
        email: 'owner@example.com',
        password: 'password123',
        name: 'Owner',
      })
      .expect(201);

    const token = (signupResponse.body as { token: string }).token;

    expect(token).toBeTruthy();

    await request(httpApp)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((response: Response) => {
        const body = response.body as { email: string; name: string };
        expect(body.email).toBe('owner@example.com');
        expect(body.name).toBe('Owner');
      });

    const categoryResponse = await request(httpApp)
      .post('/api/catalog/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: '리서치 보드',
        summary: '프로토타입을 분류하기 위한 카테고리입니다.',
        group: 'research',
        iconKey: 'custom',
        tags: ['ux', 'research'],
        checklist: ['핵심 흐름 정의'],
      })
      .expect(201);

    const category = categoryResponse.body as { id: string; title: string };

    expect(category.title).toBe('리서치 보드');

    const prototypeResponse = await request(httpApp)
      .post(`/api/catalog/categories/${category.id}/prototypes`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: '인터뷰 정리 대시보드',
        repoUrl: 'https://github.com/example/research-board',
        demoUrl: 'https://example.com/research-board',
        summary: '사용자 인터뷰 결과를 정리하는 프로토타입입니다.',
        status: 'draft',
        visibility: 'private',
        tags: ['dashboard'],
        notes: '초기 검증 버전',
      })
      .expect(201);

    const prototypeCategory = prototypeResponse.body as {
      prototypes: Array<{ title: string; notes: string | null }>;
    };

    expect(prototypeCategory.prototypes).toHaveLength(1);
    expect(prototypeCategory.prototypes[0]?.title).toBe('인터뷰 정리 대시보드');
    expect(prototypeCategory.prototypes[0]?.notes).toBe('초기 검증 버전');
  });

  afterEach(async () => {
    await app.close();
    rmSync(databaseFile, { force: true });
  });
});

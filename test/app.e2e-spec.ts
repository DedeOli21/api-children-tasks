import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health responde 200 com status ok', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(typeof res.body.timestamp).toBe('string');
      });
  });

  it('rota protegida sem token responde 401', () => {
    return request(app.getHttpServer()).get('/api/children').expect(401);
  });

  it('rota inexistente responde 404', () => {
    return request(app.getHttpServer())
      .get('/api/rota-que-nao-existe')
      .expect(404);
  });
});

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import { authHeader, registerParent } from './utils/fixtures';

// Cobre o CRUD de catálogos da família (recompensas, penalidades e prêmios
// da caixa surpresa) e o isolamento entre famílias diferentes.
describe('Catalog management (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('rewards', () => {
    it('CRUD completo de recompensas', async () => {
      const { token } = await registerParent(app);

      const created = await request(app.getHttpServer())
        .post('/api/rewards')
        .set(authHeader(token))
        .send({ title: 'Filme em família', emoji: '🎬', cost: 5 })
        .expect(201);

      const updated = await request(app.getHttpServer())
        .patch(`/api/rewards/${created.body.id}`)
        .set(authHeader(token))
        .send({ cost: 6 })
        .expect(200);
      expect(updated.body.cost).toBe(6);

      await request(app.getHttpServer())
        .delete(`/api/rewards/${created.body.id}`)
        .set(authHeader(token))
        .expect(200);

      const list = await request(app.getHttpServer())
        .get('/api/rewards')
        .set(authHeader(token))
        .expect(200);
      expect(list.body).toHaveLength(0);
    });

    it('não permite editar recompensa de outra família', async () => {
      const parentA = await registerParent(app);
      const parentB = await registerParent(app);
      const reward = await request(app.getHttpServer())
        .post('/api/rewards')
        .set(authHeader(parentA.token))
        .send({ title: 'Só da família A', emoji: '🎁', cost: 3 })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/rewards/${reward.body.id}`)
        .set(authHeader(parentB.token))
        .send({ cost: 1 })
        .expect(404);
    });
  });

  describe('penalties', () => {
    it('CRUD completo de penalidades', async () => {
      const { token } = await registerParent(app);

      const created = await request(app.getHttpServer())
        .post('/api/penalties')
        .set(authHeader(token))
        .send({ title: 'Gritou com a irmã', emoji: '😠', amount: 2 })
        .expect(201);

      const updated = await request(app.getHttpServer())
        .patch(`/api/penalties/${created.body.id}`)
        .set(authHeader(token))
        .send({ amount: 4 })
        .expect(200);
      expect(updated.body.amount).toBe(4);

      await request(app.getHttpServer())
        .delete(`/api/penalties/${created.body.id}`)
        .set(authHeader(token))
        .expect(200);
    });
  });

  describe('mystery box prizes', () => {
    it('CRUD completo de prêmios', async () => {
      const { token } = await registerParent(app);

      const created = await request(app.getHttpServer())
        .post('/api/mystery-box/prizes')
        .set(authHeader(token))
        .send({
          name: 'Chaveiro',
          emoji: '🔑',
          rarity: 'common',
          description: 'Um chaveiro',
        })
        .expect(201);

      const updated = await request(app.getHttpServer())
        .patch(`/api/mystery-box/prizes/${created.body.id}`)
        .set(authHeader(token))
        .send({ weight: 5 })
        .expect(200);
      expect(updated.body.weight).toBe(5);

      const config = await request(app.getHttpServer())
        .get('/api/mystery-box')
        .set(authHeader(token))
        .expect(200);
      expect(config.body.prizes).toHaveLength(1);
      expect(config.body.cost).toBe(5);

      await request(app.getHttpServer())
        .delete(`/api/mystery-box/prizes/${created.body.id}`)
        .set(authHeader(token))
        .expect(200);
    });

    it('rejeita raridade inválida', async () => {
      const { token } = await registerParent(app);
      await request(app.getHttpServer())
        .post('/api/mystery-box/prizes')
        .set(authHeader(token))
        .send({
          name: 'X',
          emoji: '🎲',
          rarity: 'inexistente',
          description: 'desc',
        })
        .expect(400);
    });
  });
});

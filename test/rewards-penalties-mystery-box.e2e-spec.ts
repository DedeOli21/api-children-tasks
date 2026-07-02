import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import {
  authHeader,
  createChild,
  login,
  registerParent,
} from './utils/fixtures';

describe('Rewards, Penalties & Mystery Box (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function giveStars(
    parentToken: string,
    childId: string,
    amount: number,
  ) {
    await request(app.getHttpServer())
      .patch('/api/stars/add')
      .set(authHeader(parentToken))
      .send({ childId, amount })
      .expect(200);
  }

  describe('rewards', () => {
    it('criança resgata uma recompensa e as estrelas são descontadas', async () => {
      const { token } = await registerParent(app);
      const { child, username, password } = await createChild(app, token);
      const childAuth = await login(app, username, password);
      await giveStars(token, child.id, 10);

      const reward = await request(app.getHttpServer())
        .post('/api/rewards')
        .set(authHeader(token))
        .send({ title: '30min de vídeo game', emoji: '🎮', cost: 8 })
        .expect(201);

      const redeemed = await request(app.getHttpServer())
        .post(`/api/rewards/${reward.body.id}/redeem`)
        .set(authHeader(childAuth.token))
        .expect(201);

      expect(redeemed.body.currentStars).toBe(2);
    });

    it('bloqueia resgate sem estrelas suficientes', async () => {
      const { token } = await registerParent(app);
      const { username, password } = await createChild(app, token);
      const childAuth = await login(app, username, password);

      const reward = await request(app.getHttpServer())
        .post('/api/rewards')
        .set(authHeader(token))
        .send({ title: 'Recompensa cara', emoji: '🏆', cost: 100 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/rewards/${reward.body.id}/redeem`)
        .set(authHeader(childAuth.token))
        .expect(400);
    });
  });

  describe('penalties', () => {
    it('responsável aplica penalidade e reseta o streak', async () => {
      const { token } = await registerParent(app);
      const { child } = await createChild(app, token);
      await giveStars(token, child.id, 10);

      const penalty = await request(app.getHttpServer())
        .post('/api/penalties')
        .set(authHeader(token))
        .send({ title: 'Brigou com o irmão', emoji: '😠', amount: 3 })
        .expect(201);

      const applied = await request(app.getHttpServer())
        .post('/api/penalties/apply')
        .set(authHeader(token))
        .send({ penaltyId: penalty.body.id, childId: child.id })
        .expect(201);

      expect(applied.body.currentStars).toBe(7);
      expect(applied.body.streakReset).toBe(true);
    });

    it('não deixa o saldo de estrelas ficar negativo', async () => {
      const { token } = await registerParent(app);
      const { child } = await createChild(app, token);
      await giveStars(token, child.id, 2);

      const penalty = await request(app.getHttpServer())
        .post('/api/penalties')
        .set(authHeader(token))
        .send({ title: 'Penalidade grande', emoji: '😠', amount: 10 })
        .expect(201);

      const applied = await request(app.getHttpServer())
        .post('/api/penalties/apply')
        .set(authHeader(token))
        .send({ penaltyId: penalty.body.id, childId: child.id })
        .expect(201);

      expect(applied.body.currentStars).toBe(0);
    });
  });

  describe('mystery box', () => {
    it('abre a caixa quando há estrelas suficientes e credita o prêmio no histórico', async () => {
      const { token } = await registerParent(app);
      const { child, username, password } = await createChild(app, token);
      const childAuth = await login(app, username, password);
      await giveStars(token, child.id, 10);

      await request(app.getHttpServer())
        .post('/api/mystery-box/prizes')
        .set(authHeader(token))
        .send({
          name: 'Adesivo',
          emoji: '⭐',
          rarity: 'common',
          description: 'Um adesivo legal',
        })
        .expect(201);

      const opened = await request(app.getHttpServer())
        .post('/api/mystery-box/open')
        .set(authHeader(childAuth.token))
        .expect(201);

      expect(opened.body.newBalance).toBe(5);
      expect(opened.body.prize.name).toBe('Adesivo');
    });

    it('bloqueia abrir a caixa sem estrelas suficientes', async () => {
      const { token } = await registerParent(app);
      const { username, password } = await createChild(app, token);
      const childAuth = await login(app, username, password);

      await request(app.getHttpServer())
        .post('/api/mystery-box/prizes')
        .set(authHeader(token))
        .send({
          name: 'Prêmio',
          emoji: '🎁',
          rarity: 'rare',
          description: 'Descrição',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/mystery-box/open')
        .set(authHeader(childAuth.token))
        .expect(400);
    });

    it('bloqueia abrir a caixa sem prêmios cadastrados', async () => {
      const { token } = await registerParent(app);
      const { child, username, password } = await createChild(app, token);
      const childAuth = await login(app, username, password);
      await giveStars(token, child.id, 10);

      await request(app.getHttpServer())
        .post('/api/mystery-box/open')
        .set(authHeader(childAuth.token))
        .expect(400);
    });
  });
});

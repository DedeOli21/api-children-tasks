import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import {
  authHeader,
  createChild,
  createLinkedTherapist,
  registerParent,
} from './utils/fixtures';

describe('Stars (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responsável adiciona e remove estrelas manualmente', async () => {
    const { token } = await registerParent(app);
    const { child } = await createChild(app, token);

    const added = await request(app.getHttpServer())
      .patch('/api/stars/add')
      .set(authHeader(token))
      .send({ childId: child.id, amount: 5, reason: 'Ajuda em casa' })
      .expect(200);
    expect(added.body.currentStars).toBe(5);

    const subtracted = await request(app.getHttpServer())
      .patch('/api/stars/subtract')
      .set(authHeader(token))
      .send({ childId: child.id, amount: 2 })
      .expect(200);
    expect(subtracted.body.currentStars).toBe(3);
  });

  it('não permite remover mais estrelas do que a criança possui', async () => {
    const { token } = await registerParent(app);
    const { child } = await createChild(app, token);

    await request(app.getHttpServer())
      .patch('/api/stars/subtract')
      .set(authHeader(token))
      .send({ childId: child.id, amount: 1 })
      .expect(400);
  });

  it('impede ajustar estrelas de criança de outra família', async () => {
    const parentA = await registerParent(app);
    const parentB = await registerParent(app);
    const { child } = await createChild(app, parentA.token);

    await request(app.getHttpServer())
      .patch('/api/stars/add')
      .set(authHeader(parentB.token))
      .send({ childId: child.id, amount: 1 })
      .expect(403);
  });

  describe('bonificação sugerida pela terapeuta', () => {
    it('fluxo completo: terapeuta sugere -> responsável aprova -> estrelas creditadas', async () => {
      const { token: parentToken } = await registerParent(app);
      const { child } = await createChild(app, parentToken);
      const therapist = await createLinkedTherapist(app, parentToken, child.id);

      const suggestion = await request(app.getHttpServer())
        .post('/api/stars/suggest')
        .set(authHeader(therapist.token))
        .send({ childId: child.id, amount: 3, reason: 'Ótima sessão hoje' })
        .expect(201);
      expect(suggestion.body.status).toBe('pending');

      const pending = await request(app.getHttpServer())
        .get('/api/stars/requests')
        .set(authHeader(parentToken))
        .expect(200);
      expect(pending.body).toHaveLength(1);

      const approved = await request(app.getHttpServer())
        .patch(`/api/stars/approve/${suggestion.body.id}`)
        .set(authHeader(parentToken))
        .expect(200);
      expect(approved.body.currentStars).toBe(3);
      expect(approved.body.status).toBe('approved');
    });

    it('recusar a sugestão não credita estrelas', async () => {
      const { token: parentToken } = await registerParent(app);
      const { child } = await createChild(app, parentToken);
      const therapist = await createLinkedTherapist(app, parentToken, child.id);

      const suggestion = await request(app.getHttpServer())
        .post('/api/stars/suggest')
        .set(authHeader(therapist.token))
        .send({ childId: child.id, amount: 4, reason: 'Bonificação teste' })
        .expect(201);

      const rejected = await request(app.getHttpServer())
        .patch(`/api/stars/reject/${suggestion.body.id}`)
        .set(authHeader(parentToken))
        .expect(200);
      expect(rejected.body.status).toBe('rejected');

      const stars = await request(app.getHttpServer())
        .get('/api/stars')
        .set(authHeader(parentToken))
        .query({ childId: child.id })
        .expect(200);
      expect(stars.body.currentStars).toBe(0);
    });

    it('exige motivo com pelo menos 5 caracteres', async () => {
      const { token: parentToken } = await registerParent(app);
      const { child } = await createChild(app, parentToken);
      const therapist = await createLinkedTherapist(app, parentToken, child.id);

      await request(app.getHttpServer())
        .post('/api/stars/suggest')
        .set(authHeader(therapist.token))
        .send({ childId: child.id, amount: 2, reason: 'oi' })
        .expect(400);
    });

    it('terapeuta não vinculada não pode sugerir estrelas para a criança', async () => {
      const { token: parentToken } = await registerParent(app);
      const { child } = await createChild(app, parentToken);
      const outroPai = await registerParent(app);
      const outraCrianca = await createChild(app, outroPai.token);
      const therapist = await createLinkedTherapist(
        app,
        outroPai.token,
        outraCrianca.child.id,
      );

      await request(app.getHttpServer())
        .post('/api/stars/suggest')
        .set(authHeader(therapist.token))
        .send({ childId: child.id, amount: 2, reason: 'Não deveria funcionar' })
        .expect(403);
    });

    it('responsável não pode aprovar bonificação já resolvida', async () => {
      const { token: parentToken } = await registerParent(app);
      const { child } = await createChild(app, parentToken);
      const therapist = await createLinkedTherapist(app, parentToken, child.id);

      const suggestion = await request(app.getHttpServer())
        .post('/api/stars/suggest')
        .set(authHeader(therapist.token))
        .send({ childId: child.id, amount: 2, reason: 'Primeira sugestão' })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/stars/approve/${suggestion.body.id}`)
        .set(authHeader(parentToken))
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/stars/approve/${suggestion.body.id}`)
        .set(authHeader(parentToken))
        .expect(400);
    });
  });
});

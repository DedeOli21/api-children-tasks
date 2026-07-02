import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import {
  authHeader,
  createChild,
  createLinkedTherapist,
  registerParent,
  uniqueEmail,
} from './utils/fixtures';

describe('Therapists (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responsável cria e vincula uma nova terapeuta à criança', async () => {
    const { token: parentToken } = await registerParent(app);
    const { child } = await createChild(app, parentToken);

    const res = await request(app.getHttpServer())
      .post('/api/therapists')
      .set(authHeader(parentToken))
      .send({
        childId: child.id,
        email: uniqueEmail('therapist'),
        name: 'Dra. Ana',
        password: 'senha123',
      })
      .expect(201);
    expect(res.body.name).toBe('Dra. Ana');

    const list = await request(app.getHttpServer())
      .get('/api/therapists')
      .set(authHeader(parentToken))
      .expect(200);
    expect(list.body).toHaveLength(1);
  });

  it('reaproveita terapeuta existente ao vincular a outra criança da família', async () => {
    const { token: parentToken } = await registerParent(app);
    const { child: child1 } = await createChild(app, parentToken, {
      name: 'Filho 1',
    });
    const { child: child2 } = await createChild(app, parentToken, {
      name: 'Filho 2',
    });
    const email = uniqueEmail('therapist-shared');

    await request(app.getHttpServer())
      .post('/api/therapists')
      .set(authHeader(parentToken))
      .send({
        childId: child1.id,
        email,
        name: 'Terapeuta',
        password: 'senha123',
      })
      .expect(201);

    // Segunda vez: não precisa reenviar nome/senha, pois a conta já existe
    await request(app.getHttpServer())
      .post('/api/therapists')
      .set(authHeader(parentToken))
      .send({ childId: child2.id, email })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/api/therapists')
      .set(authHeader(parentToken))
      .expect(200);
    expect(list.body).toHaveLength(2);
  });

  it('rejeita vincular a mesma terapeuta duas vezes à mesma criança', async () => {
    const { token: parentToken } = await registerParent(app);
    const { child } = await createChild(app, parentToken);
    const email = uniqueEmail('therapist-dup');

    await request(app.getHttpServer())
      .post('/api/therapists')
      .set(authHeader(parentToken))
      .send({ childId: child.id, email, name: 'T', password: 'senha123' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/therapists')
      .set(authHeader(parentToken))
      .send({ childId: child.id, email })
      .expect(409);
  });

  it('terapeuta vê seus pacientes, a timeline e as analytics', async () => {
    const { token: parentToken } = await registerParent(app);
    const { child } = await createChild(app, parentToken);
    const therapist = await createLinkedTherapist(app, parentToken, child.id);

    // Gera algum histórico para aparecer na timeline/analytics
    await request(app.getHttpServer())
      .patch('/api/stars/add')
      .set(authHeader(parentToken))
      .send({ childId: child.id, amount: 2, reason: 'Histórico de teste' })
      .expect(200);

    const patients = await request(app.getHttpServer())
      .get('/api/therapists/patients')
      .set(authHeader(therapist.token))
      .expect(200);
    expect(patients.body).toHaveLength(1);
    expect(patients.body[0].id).toBe(child.id);

    const timeline = await request(app.getHttpServer())
      .get(`/api/therapists/patients/${child.id}/timeline`)
      .set(authHeader(therapist.token))
      .expect(200);
    expect(timeline.body.child.id).toBe(child.id);
    expect(timeline.body.events.length).toBeGreaterThan(0);

    const analytics = await request(app.getHttpServer())
      .get(`/api/therapists/patients/${child.id}/analytics`)
      .set(authHeader(therapist.token))
      .expect(200);
    expect(analytics.body.totals.starsEarned).toBe(2);
  });

  it('responsável também pode ver a timeline do próprio filho', async () => {
    const { token: parentToken } = await registerParent(app);
    const { child } = await createChild(app, parentToken);

    const timeline = await request(app.getHttpServer())
      .get(`/api/therapists/patients/${child.id}/timeline`)
      .set(authHeader(parentToken))
      .expect(200);
    expect(timeline.body.child.id).toBe(child.id);
  });

  it('terapeuta não vinculada não acessa a timeline da criança', async () => {
    const { token: parentToken } = await registerParent(app);
    const { child } = await createChild(app, parentToken);
    const outroPai = await registerParent(app);
    const { child: outraCrianca } = await createChild(app, outroPai.token);
    const therapist = await createLinkedTherapist(
      app,
      outroPai.token,
      outraCrianca.id,
    );

    await request(app.getHttpServer())
      .get(`/api/therapists/patients/${child.id}/timeline`)
      .set(authHeader(therapist.token))
      .expect(403);
  });

  it('responsável remove o acesso da terapeuta', async () => {
    const { token: parentToken } = await registerParent(app);
    const { child } = await createChild(app, parentToken);
    const therapist = await createLinkedTherapist(app, parentToken, child.id);

    await request(app.getHttpServer())
      .delete(`/api/therapists/${therapist.user.id}/children/${child.id}`)
      .set(authHeader(parentToken))
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/therapists/patients')
      .set(authHeader(therapist.token))
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveLength(0);
      });
  });
});

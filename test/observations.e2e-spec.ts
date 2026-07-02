import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import {
  authHeader,
  createChild,
  createLinkedTeacher,
  createLinkedTherapist,
  registerParent,
} from './utils/fixtures';

describe('Observations (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('terapeuta registra uma observação clínica e o responsável consegue ler', async () => {
    const { token: parentToken } = await registerParent(app);
    const { child } = await createChild(app, parentToken);
    const therapist = await createLinkedTherapist(app, parentToken, child.id);

    const created = await request(app.getHttpServer())
      .post('/api/observations')
      .set(authHeader(therapist.token))
      .send({
        childId: child.id,
        type: 'clinical',
        text: 'Boa evolução na sessão de hoje',
      })
      .expect(201);
    expect(created.body.authorRole).toBe('therapist');

    const list = await request(app.getHttpServer())
      .get('/api/observations')
      .set(authHeader(parentToken))
      .query({ childId: child.id })
      .expect(200);
    expect(list.body).toHaveLength(1);
  });

  it('professor também pode registrar observações comportamentais', async () => {
    const { token: parentToken } = await registerParent(app);
    const { child } = await createChild(app, parentToken);
    const teacher = await createLinkedTeacher(app, child);

    await request(app.getHttpServer())
      .post('/api/observations')
      .set(authHeader(teacher.token))
      .send({
        childId: child.id,
        type: 'behavioral',
        text: 'Ótima participação em grupo',
      })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/api/observations')
      .set(authHeader(teacher.token))
      .query({ childId: child.id })
      .expect(200);
    expect(list.body).toHaveLength(1);
  });

  it('valida texto mínimo de 5 caracteres', async () => {
    const { token: parentToken } = await registerParent(app);
    const { child } = await createChild(app, parentToken);
    const therapist = await createLinkedTherapist(app, parentToken, child.id);

    await request(app.getHttpServer())
      .post('/api/observations')
      .set(authHeader(therapist.token))
      .send({ childId: child.id, text: 'oi' })
      .expect(400);
  });

  it('criança não pode acessar observações (canal exclusivo de adultos)', async () => {
    const { token: parentToken } = await registerParent(app);
    const { child, username, password } = await createChild(app, parentToken);
    const childLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: username, password })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/observations')
      .set(authHeader(childLogin.body.access_token))
      .query({ childId: child.id })
      .expect(403);
  });
});

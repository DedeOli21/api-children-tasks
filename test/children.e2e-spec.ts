import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import {
  authHeader,
  createChild,
  registerParent,
  registerTeacher,
  uniqueUsername,
} from './utils/fixtures';

describe('Children (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responsável cria uma criança com código de convite único', async () => {
    const { token } = await registerParent(app);
    const { child } = await createChild(app, token, { name: 'Pedro' });

    expect(child.name).toBe('Pedro');
    expect(child.inviteCode).toEqual(expect.any(String));
    expect(child.currentStars).toBe(0);
  });

  it('rejeita nome de usuário já em uso', async () => {
    const { token } = await registerParent(app);
    const username = uniqueUsername('duplicado');
    await createChild(app, token, { username });

    await request(app.getHttpServer())
      .post('/api/children')
      .set(authHeader(token))
      .send({ name: 'Outra Criança', username, password: 'pin1234' })
      .expect(409);
  });

  it('valida usuário e senha da criança', async () => {
    const { token } = await registerParent(app);
    await request(app.getHttpServer())
      .post('/api/children')
      .set(authHeader(token))
      .send({ name: 'Criança', username: 'AB', password: '12' })
      .expect(400);
  });

  it('lista apenas as crianças do próprio responsável', async () => {
    const parentA = await registerParent(app);
    const parentB = await registerParent(app);
    await createChild(app, parentA.token, { name: 'Filho de A' });
    await createChild(app, parentB.token, { name: 'Filho de B' });

    const res = await request(app.getHttpServer())
      .get('/api/children')
      .set(authHeader(parentA.token))
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Filho de A');
  });

  it('impede um responsável de ver/editar criança de outra família', async () => {
    const parentA = await registerParent(app);
    const parentB = await registerParent(app);
    const { child } = await createChild(app, parentA.token);

    await request(app.getHttpServer())
      .get(`/api/children/${child.id}`)
      .set(authHeader(parentB.token))
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/children/${child.id}`)
      .set(authHeader(parentB.token))
      .send({ name: 'Hackeado' })
      .expect(404);
  });

  it('atualiza nome e senha da criança', async () => {
    const { token } = await registerParent(app);
    const { child } = await createChild(app, token);

    const res = await request(app.getHttpServer())
      .patch(`/api/children/${child.id}`)
      .set(authHeader(token))
      .send({ name: 'Novo Nome' })
      .expect(200);

    expect(res.body.name).toBe('Novo Nome');
  });

  it('remove uma criança da família', async () => {
    const { token } = await registerParent(app);
    const { child } = await createChild(app, token);

    await request(app.getHttpServer())
      .delete(`/api/children/${child.id}`)
      .set(authHeader(token))
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/children/${child.id}`)
      .set(authHeader(token))
      .expect(404);
  });

  it('professor não pode acessar rotas de /children (apenas responsável)', async () => {
    const teacher = await registerTeacher(app);
    await request(app.getHttpServer())
      .get('/api/children')
      .set(authHeader(teacher.token))
      .expect(403);
  });

  it('relatórios da criança começam vazios', async () => {
    const { token } = await registerParent(app);
    const { child } = await createChild(app, token);

    const res = await request(app.getHttpServer())
      .get(`/api/children/${child.id}/reports`)
      .set(authHeader(token))
      .expect(200);

    expect(res.body).toEqual([]);
  });
});

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import {
  authHeader,
  createChild,
  registerParent,
  registerTeacher,
} from './utils/fixtures';

describe('Teacher (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('professor vincula aluno pelo código de convite', async () => {
    const { token: parentToken } = await registerParent(app);
    const { child } = await createChild(app, parentToken, { name: 'Aluno' });
    const teacher = await registerTeacher(app);

    const res = await request(app.getHttpServer())
      .post('/api/teacher/students')
      .set(authHeader(teacher.token))
      .send({ inviteCode: child.inviteCode })
      .expect(201);
    expect(res.body.name).toBe('Aluno');

    const list = await request(app.getHttpServer())
      .get('/api/teacher/students')
      .set(authHeader(teacher.token))
      .expect(200);
    expect(list.body).toHaveLength(1);
  });

  it('rejeita código de convite inexistente', async () => {
    const teacher = await registerTeacher(app);
    await request(app.getHttpServer())
      .post('/api/teacher/students')
      .set(authHeader(teacher.token))
      .send({ inviteCode: 'CODIGO-INVALIDO' })
      .expect(404);
  });

  it('não permite vincular o mesmo aluno duas vezes', async () => {
    const { token: parentToken } = await registerParent(app);
    const { child } = await createChild(app, parentToken);
    const teacher = await registerTeacher(app);

    await request(app.getHttpServer())
      .post('/api/teacher/students')
      .set(authHeader(teacher.token))
      .send({ inviteCode: child.inviteCode })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/teacher/students')
      .set(authHeader(teacher.token))
      .send({ inviteCode: child.inviteCode })
      .expect(409);
  });

  it('professor dá estrelas e escreve relatório com estrelas embutidas', async () => {
    const { token: parentToken } = await registerParent(app);
    const { child } = await createChild(app, parentToken);
    const teacher = await registerTeacher(app);
    await request(app.getHttpServer())
      .post('/api/teacher/students')
      .set(authHeader(teacher.token))
      .send({ inviteCode: child.inviteCode })
      .expect(201);

    const stars = await request(app.getHttpServer())
      .post(`/api/teacher/students/${child.id}/stars`)
      .set(authHeader(teacher.token))
      .send({ amount: 2, reason: 'Participação em sala' })
      .expect(201);
    expect(stars.body.currentStars).toBe(2);

    const report = await request(app.getHttpServer())
      .post(`/api/teacher/students/${child.id}/reports`)
      .set(authHeader(teacher.token))
      .send({ text: 'Dia produtivo', rating: 4, starsAwarded: 3 })
      .expect(201);
    expect(report.body.currentStars).toBe(5);

    const reports = await request(app.getHttpServer())
      .get(`/api/teacher/students/${child.id}/reports`)
      .set(authHeader(teacher.token))
      .expect(200);
    expect(reports.body).toHaveLength(1);

    // O relatório também aparece para o responsável, com o nome do professor
    const parentReports = await request(app.getHttpServer())
      .get(`/api/children/${child.id}/reports`)
      .set(authHeader(parentToken))
      .expect(200);
    expect(parentReports.body).toHaveLength(1);
    expect(parentReports.body[0].teacherName).toBeTruthy();
  });

  it('bloqueia ação sobre aluno não vinculado', async () => {
    const { token: parentToken } = await registerParent(app);
    const { child } = await createChild(app, parentToken);
    const teacher = await registerTeacher(app);

    await request(app.getHttpServer())
      .post(`/api/teacher/students/${child.id}/stars`)
      .set(authHeader(teacher.token))
      .send({ amount: 1, reason: 'Teste' })
      .expect(403);
  });

  it('desvincula um aluno', async () => {
    const { token: parentToken } = await registerParent(app);
    const { child } = await createChild(app, parentToken);
    const teacher = await registerTeacher(app);
    await request(app.getHttpServer())
      .post('/api/teacher/students')
      .set(authHeader(teacher.token))
      .send({ inviteCode: child.inviteCode })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/teacher/students/${child.id}`)
      .set(authHeader(teacher.token))
      .expect(200);

    const list = await request(app.getHttpServer())
      .get('/api/teacher/students')
      .set(authHeader(teacher.token))
      .expect(200);
    expect(list.body).toHaveLength(0);
  });

  it('responsável não pode acessar rotas de /teacher', async () => {
    const { token: parentToken } = await registerParent(app);
    await request(app.getHttpServer())
      .get('/api/teacher/students')
      .set(authHeader(parentToken))
      .expect(403);
  });
});

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import {
  authHeader,
  createChild,
  createLinkedTeacher,
  login,
  registerParent,
  registerTeacher,
} from './utils/fixtures';

describe('Missions (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const today = () => new Date().toISOString().split('T')[0];

  it('fluxo completo: professor cria -> responsável aloca -> criança conclui -> responsável aprova', async () => {
    const { token: parentToken } = await registerParent(app);
    const { child, username, password } = await createChild(app, parentToken);
    const childAuth = await login(app, username, password);
    const teacher = await createLinkedTeacher(app, child);

    const created = await request(app.getHttpServer())
      .post('/api/missions')
      .set(authHeader(teacher.token))
      .send({
        childIds: [child.id],
        title: 'Dever de matemática',
        starsReward: 2,
      })
      .expect(201);
    expect(created.body).toHaveLength(1);
    const missionId = created.body[0].id;
    expect(created.body[0].status).toBe('inbox');

    const inbox = await request(app.getHttpServer())
      .get('/api/missions/inbox')
      .set(authHeader(parentToken))
      .expect(200);
    expect(inbox.body).toHaveLength(1);

    const allocated = await request(app.getHttpServer())
      .patch(`/api/missions/${missionId}/allocate`)
      .set(authHeader(parentToken))
      .send({ date: today() })
      .expect(200);
    expect(allocated.body.status).toBe('scheduled');

    const day = await request(app.getHttpServer())
      .get('/api/missions/day')
      .set(authHeader(childAuth.token))
      .query({ date: today() })
      .expect(200);
    expect(day.body).toHaveLength(1);

    const done = await request(app.getHttpServer())
      .patch(`/api/missions/${missionId}/complete`)
      .set(authHeader(childAuth.token))
      .expect(200);
    expect(done.body.status).toBe('completed');

    const pendingApproval = await request(app.getHttpServer())
      .get('/api/missions/pending-approval')
      .set(authHeader(parentToken))
      .expect(200);
    expect(pendingApproval.body).toHaveLength(1);

    const approved = await request(app.getHttpServer())
      .patch(`/api/missions/${missionId}/approve`)
      .set(authHeader(parentToken))
      .expect(200);
    expect(approved.body.currentStars).toBe(2);
    expect(approved.body.status).toBe('approved');
  });

  it('não permite concluir missão ainda na inbox (não alocada)', async () => {
    const { token: parentToken } = await registerParent(app);
    const { child, username, password } = await createChild(app, parentToken);
    const childAuth = await login(app, username, password);
    const teacher = await createLinkedTeacher(app, child);

    const created = await request(app.getHttpServer())
      .post('/api/missions')
      .set(authHeader(teacher.token))
      .send({ childIds: [child.id], title: 'Ainda na inbox' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/missions/${created.body[0].id}/complete`)
      .set(authHeader(childAuth.token))
      .expect(400);
  });

  it('devolve missão agendada para a inbox', async () => {
    const { token: parentToken } = await registerParent(app);
    const { child } = await createChild(app, parentToken);
    const teacher = await createLinkedTeacher(app, child);

    const created = await request(app.getHttpServer())
      .post('/api/missions')
      .set(authHeader(teacher.token))
      .send({ childIds: [child.id], title: 'Vai e volta' })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/missions/${created.body[0].id}/allocate`)
      .set(authHeader(parentToken))
      .send({ date: today() })
      .expect(200);

    const backToInbox = await request(app.getHttpServer())
      .patch(`/api/missions/${created.body[0].id}/unschedule`)
      .set(authHeader(parentToken))
      .expect(200);
    expect(backToInbox.body.status).toBe('inbox');
  });

  it('professor remove missão não aprovada; responsável também pode remover', async () => {
    const { token: parentToken } = await registerParent(app);
    const { child } = await createChild(app, parentToken);
    const teacher = await createLinkedTeacher(app, child);

    const created = await request(app.getHttpServer())
      .post('/api/missions')
      .set(authHeader(teacher.token))
      .send({ childIds: [child.id], title: 'Removível' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/missions/${created.body[0].id}`)
      .set(authHeader(teacher.token))
      .expect(200);
  });

  it('bloqueia professor de criar missão para aluno não vinculado', async () => {
    const { token: parentToken } = await registerParent(app);
    const { child } = await createChild(app, parentToken);
    const teacher = await registerTeacher(app);

    await request(app.getHttpServer())
      .post('/api/missions')
      .set(authHeader(teacher.token))
      .send({ childIds: [child.id], title: 'Não vinculado' })
      .expect(403);
  });
});

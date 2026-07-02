import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import {
  authHeader,
  createChild,
  login,
  registerParent,
} from './utils/fixtures';

describe('Tasks (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function setupFamilyWithTask() {
    const parent = await registerParent(app);
    const { child, username, password } = await createChild(app, parent.token);
    const childAuth = await login(app, username, password);

    const taskRes = await request(app.getHttpServer())
      .post('/api/tasks')
      .set(authHeader(parent.token))
      .send({ title: 'Escovar os dentes', iconEmoji: '🦷' })
      .expect(201);

    return { parent, child, childAuth, task: taskRes.body };
  }

  it('responsável cria uma tarefa para a família', async () => {
    const { task } = await setupFamilyWithTask();
    expect(task.title).toBe('Escovar os dentes');
    expect(task.active).toBe(true);
  });

  it('criança vê a tarefa pendente no próprio dia', async () => {
    const { childAuth } = await setupFamilyWithTask();

    const res = await request(app.getHttpServer())
      .get('/api/tasks')
      .set(authHeader(childAuth.token))
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('pending');
    expect(res.body[0].completedToday).toBe(false);
  });

  it('fluxo completo: criança completa -> fila de aprovação -> responsável aprova e credita estrela', async () => {
    const { parent, child, childAuth, task } = await setupFamilyWithTask();

    const completeRes = await request(app.getHttpServer())
      .patch(`/api/tasks/${task.id}/complete`)
      .set(authHeader(childAuth.token))
      .expect(200);
    expect(completeRes.body.status).toBe('completed');
    expect(completeRes.body.starsEarned).toBe(0);

    const pending = await request(app.getHttpServer())
      .get('/api/tasks/pending-approval')
      .set(authHeader(parent.token))
      .expect(200);
    expect(pending.body).toHaveLength(1);
    const logId = pending.body[0].logId;
    expect(pending.body[0].childId).toBe(child.id);

    const approveRes = await request(app.getHttpServer())
      .patch(`/api/tasks/logs/${logId}/approve`)
      .set(authHeader(parent.token))
      .expect(200);
    expect(approveRes.body.starsEarned).toBe(1);
    expect(approveRes.body.currentStars).toBe(1);

    const stars = await request(app.getHttpServer())
      .get('/api/stars')
      .set(authHeader(childAuth.token))
      .expect(200);
    expect(stars.body.currentStars).toBe(1);
  });

  it('não permite aprovar a mesma execução duas vezes', async () => {
    const { parent, childAuth, task } = await setupFamilyWithTask();
    await request(app.getHttpServer())
      .patch(`/api/tasks/${task.id}/complete`)
      .set(authHeader(childAuth.token))
      .expect(200);

    const pending = await request(app.getHttpServer())
      .get('/api/tasks/pending-approval')
      .set(authHeader(parent.token))
      .expect(200);
    const logId = pending.body[0].logId;

    await request(app.getHttpServer())
      .patch(`/api/tasks/logs/${logId}/approve`)
      .set(authHeader(parent.token))
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/tasks/logs/${logId}/approve`)
      .set(authHeader(parent.token))
      .expect(400);
  });

  it('não permite aprovar tarefa que a criança ainda não marcou como feita', async () => {
    const { parent } = await setupFamilyWithTask();
    await request(app.getHttpServer())
      .patch('/api/tasks/logs/id-que-nao-existe/approve')
      .set(authHeader(parent.token))
      .expect(404);
  });

  it('desmarcar uma tarefa concluída (ainda não aprovada) volta para pendente', async () => {
    const { childAuth, task } = await setupFamilyWithTask();
    await request(app.getHttpServer())
      .patch(`/api/tasks/${task.id}/complete`)
      .set(authHeader(childAuth.token))
      .expect(200);

    const res = await request(app.getHttpServer())
      .patch(`/api/tasks/${task.id}/uncomplete`)
      .set(authHeader(childAuth.token))
      .expect(200);
    expect(res.body.status).toBe('pending');
  });

  it('tarefa já aprovada não pode ser desmarcada', async () => {
    const { parent, childAuth, task } = await setupFamilyWithTask();
    await request(app.getHttpServer())
      .patch(`/api/tasks/${task.id}/complete`)
      .set(authHeader(childAuth.token))
      .expect(200);
    const pending = await request(app.getHttpServer())
      .get('/api/tasks/pending-approval')
      .set(authHeader(parent.token))
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/tasks/logs/${pending.body[0].logId}/approve`)
      .set(authHeader(parent.token))
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/tasks/${task.id}/uncomplete`)
      .set(authHeader(childAuth.token))
      .expect(400);
  });

  it('responsável remove uma tarefa', async () => {
    const { parent, child, task } = await setupFamilyWithTask();
    await request(app.getHttpServer())
      .delete(`/api/tasks/${task.id}`)
      .set(authHeader(parent.token))
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/api/tasks')
      .set(authHeader(parent.token))
      .query({ childId: child.id })
      .expect(200);
    expect(res.body).toHaveLength(0);
  });

  it('criança não pode criar tarefas (apenas responsável)', async () => {
    const { childAuth } = await setupFamilyWithTask();
    await request(app.getHttpServer())
      .post('/api/tasks')
      .set(authHeader(childAuth.token))
      .send({ title: 'Hack', iconEmoji: '💥' })
      .expect(403);
  });
});

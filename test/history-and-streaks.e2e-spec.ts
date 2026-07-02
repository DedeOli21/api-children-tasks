import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import {
  authHeader,
  createChild,
  login,
  registerParent,
  registerTeacher,
} from './utils/fixtures';

describe('History & Streaks (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registra e lista o histórico de estrelas da criança', async () => {
    const { token } = await registerParent(app);
    const { child } = await createChild(app, token);

    await request(app.getHttpServer())
      .patch('/api/stars/add')
      .set(authHeader(token))
      .send({ childId: child.id, amount: 4, reason: 'Bom comportamento' })
      .expect(200);

    const history = await request(app.getHttpServer())
      .get('/api/history')
      .set(authHeader(token))
      .query({ childId: child.id })
      .expect(200);
    expect(history.body).toHaveLength(1);
    expect(history.body[0].starsChange).toBe(4);

    const stats = await request(app.getHttpServer())
      .get('/api/history/statistics')
      .set(authHeader(token))
      .query({ childId: child.id })
      .expect(200);
    expect(stats.body).toBeTruthy();
  });

  it('busca o histórico por intervalo de datas', async () => {
    const { token } = await registerParent(app);
    const { child } = await createChild(app, token);
    await request(app.getHttpServer())
      .patch('/api/stars/add')
      .set(authHeader(token))
      .send({ childId: child.id, amount: 1 })
      .expect(200);

    const start = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const end = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app.getHttpServer())
      .get('/api/history/range')
      .set(authHeader(token))
      .query({ childId: child.id, startDate: start, endDate: end })
      .expect(200);
    expect(res.body).toHaveLength(1);
  });

  it('professor não pode acessar o histórico (fora do escopo dele)', async () => {
    const teacher = await registerTeacher(app);

    await request(app.getHttpServer())
      .get('/api/history')
      .set(authHeader(teacher.token))
      .expect(403);
  });

  it('criança acumula e consulta o próprio streak diário', async () => {
    const { token } = await registerParent(app);
    const { username, password } = await createChild(app, token);
    const childAuth = await login(app, username, password);

    await request(app.getHttpServer())
      .post('/api/tasks')
      .set(authHeader(token))
      .send({ title: 'Arrumar a cama', iconEmoji: '🛏️' })
      .expect(201);

    const tasks = await request(app.getHttpServer())
      .get('/api/tasks')
      .set(authHeader(childAuth.token))
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/tasks/${tasks.body[0].id}/complete`)
      .set(authHeader(childAuth.token))
      .expect(200);

    const streak = await request(app.getHttpServer())
      .get('/api/streaks')
      .set(authHeader(childAuth.token))
      .expect(200);
    // Streak só fecha quando todas as tarefas do dia são concluídas; aqui já são.
    expect(streak.body.currentStreak).toBe(1);
    expect(streak.body.multiplier).toBe(1);
  });

  it('responsável concede congelamentos de streak à criança', async () => {
    const { token } = await registerParent(app);
    const { child } = await createChild(app, token);

    const res = await request(app.getHttpServer())
      .patch('/api/streaks/freezes')
      .set(authHeader(token))
      .send({ childId: child.id, amount: 2 })
      .expect(200);
    expect(res.body.streakFreezes).toBe(2);
  });
});

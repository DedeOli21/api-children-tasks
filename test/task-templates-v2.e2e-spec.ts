import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import {
  authHeader,
  createChild,
  login,
  registerParent,
} from './utils/fixtures';

const weekdays = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

function todayInSaoPaulo() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());
}

describe('Task Templates v2 (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('cria hábito recorrente, materializa tarefa do dia e aprova recompensa configurada', async () => {
    const parent = await registerParent(app);
    const { child, username, password } = await createChild(app, parent.token);
    const childAuth = await login(app, username, password);
    const today = todayInSaoPaulo();
    const weekday = weekdays[new Date(`${today}T12:00:00-03:00`).getDay()];

    const templateRes = await request(app.getHttpServer())
      .post('/api/task-templates')
      .set(authHeader(parent.token))
      .send({
        childId: child.id,
        title: 'Escovar os dentes',
        emoji: '🦷',
        rewardStars: 3,
        taskType: 'fixed',
        recurrenceDays: [weekday],
      })
      .expect(201);

    expect(templateRes.body).toMatchObject({
      childId: child.id,
      title: 'Escovar os dentes',
      rewardStars: 3,
      taskType: 'fixed',
      recurrenceDays: [weekday],
    });

    const activeTasks = await request(app.getHttpServer())
      .get('/api/active-tasks/day')
      .set(authHeader(childAuth.token))
      .query({ date: today })
      .expect(200);

    expect(activeTasks.body).toHaveLength(1);
    expect(activeTasks.body[0]).toMatchObject({
      title: 'Escovar os dentes',
      emoji: '🦷',
      rewardStars: 3,
      status: 'pending',
    });

    const activeTaskId = activeTasks.body[0].id;
    await request(app.getHttpServer())
      .patch(`/api/active-tasks/${activeTaskId}/complete`)
      .set(authHeader(childAuth.token))
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('completed');
      });

    const pending = await request(app.getHttpServer())
      .get('/api/active-tasks/pending-approval')
      .set(authHeader(parent.token))
      .expect(200);

    expect(pending.body).toHaveLength(1);
    expect(pending.body[0].childId).toBe(child.id);

    const approved = await request(app.getHttpServer())
      .patch(`/api/active-tasks/${activeTaskId}/approve`)
      .set(authHeader(parent.token))
      .expect(200);

    expect(approved.body.starsEarned).toBe(3);
    expect(approved.body.currentStars).toBe(3);

    const stars = await request(app.getHttpServer())
      .get('/api/stars')
      .set(authHeader(childAuth.token))
      .expect(200);

    expect(stars.body.currentStars).toBe(3);
  });

  it('cria missão extra para uma data específica sem exigir recorrência', async () => {
    const parent = await registerParent(app);
    const { child } = await createChild(app, parent.token);
    const today = todayInSaoPaulo();

    const templateRes = await request(app.getHttpServer())
      .post('/api/task-templates')
      .set(authHeader(parent.token))
      .send({
        childId: child.id,
        title: 'Guardar mochila',
        emoji: '🎒',
        rewardStars: 2,
        taskType: 'extra',
        recurrenceDays: [],
        scheduledDate: today,
      })
      .expect(201);

    expect(templateRes.body).toMatchObject({
      taskType: 'extra',
      recurrenceDays: [],
      scheduledDate: today,
    });
  });
});

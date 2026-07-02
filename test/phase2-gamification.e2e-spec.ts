import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import {
  authHeader,
  createChild,
  createLinkedTeacher,
  createLinkedTherapist,
  login,
  registerParent,
} from './utils/fixtures';

describe('Phase 2 gamification flows (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const today = () => new Date().toISOString().split('T')[0];

  async function giveStars(
    parentToken: string,
    childId: string,
    amount: number,
  ) {
    return request(app.getHttpServer())
      .patch('/api/stars/add')
      .set(authHeader(parentToken))
      .send({ childId, amount, reason: 'Saldo para teste' })
      .expect(200);
  }

  it('resgata o Regador Mágico em transação e adiciona proteção de streak', async () => {
    const { token: parentToken } = await registerParent(app);
    const { child, username, password } = await createChild(app, parentToken);
    const childAuth = await login(app, username, password);
    await giveStars(parentToken, child.id, 12);

    const reward = await request(app.getHttpServer())
      .post('/api/rewards')
      .set(authHeader(parentToken))
      .send({
        title: 'Regador Mágico',
        emoji: '💧',
        description: 'Protege a plantinha em um dia ruim',
        cost: 7,
        kind: 'streak_freeze',
      })
      .expect(201);

    const redeemed = await request(app.getHttpServer())
      .post(`/api/rewards/${reward.body.id}/redeem`)
      .set(authHeader(childAuth.token))
      .expect(201);

    expect(redeemed.body.currentStars).toBe(5);
    expect(redeemed.body.streakFreezes).toBe(1);

    const streak = await request(app.getHttpServer())
      .get('/api/streaks')
      .set(authHeader(childAuth.token))
      .expect(200);
    expect(streak.body.streakFreezes).toBe(1);
    expect(streak.body.plant.protectedByFreezes).toBe(true);
  });

  it('aplica Evento Surpresa em tarefa, missão e bonificação aprovada', async () => {
    const { token: parentToken } = await registerParent(app);
    const { child, username, password } = await createChild(app, parentToken);
    const childAuth = await login(app, username, password);

    await request(app.getHttpServer())
      .post('/api/events')
      .set(authHeader(parentToken))
      .send({
        name: 'Estrelas em Dobro',
        emoji: '✨',
        multiplier: 2,
        startsAt: today(),
        endsAt: today(),
      })
      .expect(201);

    const task = await request(app.getHttpServer())
      .post('/api/tasks')
      .set(authHeader(parentToken))
      .send({ title: 'Arrumar a mochila', iconEmoji: '🎒' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/tasks/${task.body.id}/complete`)
      .set(authHeader(childAuth.token))
      .expect(200);
    const pendingTasks = await request(app.getHttpServer())
      .get('/api/tasks/pending-approval')
      .set(authHeader(parentToken))
      .expect(200);
    const approvedTask = await request(app.getHttpServer())
      .patch(`/api/tasks/logs/${pendingTasks.body[0].logId}/approve`)
      .set(authHeader(parentToken))
      .expect(200);
    expect(approvedTask.body.starsEarned).toBe(2);
    expect(approvedTask.body.currentStars).toBe(2);

    const teacher = await createLinkedTeacher(app, child);
    const mission = await request(app.getHttpServer())
      .post('/api/missions')
      .set(authHeader(teacher.token))
      .send({
        childIds: [child.id],
        title: 'Leitura dirigida',
        starsReward: 3,
      })
      .expect(201);
    const missionId = mission.body[0].id;
    await request(app.getHttpServer())
      .patch(`/api/missions/${missionId}/allocate`)
      .set(authHeader(parentToken))
      .send({ date: today() })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/missions/${missionId}/complete`)
      .set(authHeader(childAuth.token))
      .expect(200);
    const approvedMission = await request(app.getHttpServer())
      .patch(`/api/missions/${missionId}/approve`)
      .set(authHeader(parentToken))
      .expect(200);
    expect(approvedMission.body.starsEarned).toBe(6);
    expect(approvedMission.body.currentStars).toBe(8);

    const therapist = await createLinkedTherapist(
      app,
      parentToken,
      child.id,
    );
    const suggestion = await request(app.getHttpServer())
      .post('/api/stars/suggest')
      .set(authHeader(therapist.token))
      .send({
        childId: child.id,
        amount: 4,
        reason: 'Excelente autorregulação',
      })
      .expect(201);

    const approvedBonus = await request(app.getHttpServer())
      .patch(`/api/stars/approve/${suggestion.body.id}`)
      .set(authHeader(parentToken))
      .expect(200);
    expect(approvedBonus.body.baseAmount).toBe(4);
    expect(approvedBonus.body.starsEarned).toBe(8);
    expect(approvedBonus.body.eventMultiplier).toBe(2);
    expect(approvedBonus.body.currentStars).toBe(16);
  });

  it('cria meta familiar, deposita com transação e conclui o cofrinho', async () => {
    const { token: parentToken } = await registerParent(app);
    const { child, username, password } = await createChild(app, parentToken);
    const childAuth = await login(app, username, password);
    await giveStars(parentToken, child.id, 7);

    const goal = await request(app.getHttpServer())
      .post('/api/goals')
      .set(authHeader(parentToken))
      .send({
        title: 'Passeio no fim de semana',
        emoji: '🏕️',
        targetStars: 5,
      })
      .expect(201);

    const deposit = await request(app.getHttpServer())
      .post(`/api/goals/${goal.body.id}/deposit`)
      .set(authHeader(childAuth.token))
      .send({ amount: 5 })
      .expect(201);
    expect(deposit.body.currentStars).toBe(2);
    expect(deposit.body.goal.depositedStars).toBe(5);
    expect(deposit.body.goal.status).toBe('completed');
    expect(deposit.body.reachedGoal).toBe(true);

    const completed = await request(app.getHttpServer())
      .patch(`/api/goals/${goal.body.id}/complete`)
      .set(authHeader(parentToken))
      .expect(200);
    expect(completed.body.goal.status).toBe('completed');
  });

  it('inicia e completa uma sessão de Modo Foco para missão agendada', async () => {
    const { token: parentToken } = await registerParent(app);
    const { child, username, password } = await createChild(app, parentToken);
    const childAuth = await login(app, username, password);
    const teacher = await createLinkedTeacher(app, child);

    const mission = await request(app.getHttpServer())
      .post('/api/missions')
      .set(authHeader(teacher.token))
      .send({ childIds: [child.id], title: 'Exercícios de matemática' })
      .expect(201);
    const missionId = mission.body[0].id;

    await request(app.getHttpServer())
      .patch(`/api/missions/${missionId}/allocate`)
      .set(authHeader(parentToken))
      .send({ date: today() })
      .expect(200);

    const focus = await request(app.getHttpServer())
      .post('/api/focus/start')
      .set(authHeader(childAuth.token))
      .send({ missionId, durationMinutes: 5 })
      .expect(201);
    expect(focus.body.status).toBe('running');

    const completed = await request(app.getHttpServer())
      .patch(`/api/focus/${focus.body.id}/complete`)
      .set(authHeader(childAuth.token))
      .expect(200);
    expect(completed.body.status).toBe('completed');
  });

  it('expõe streakBrokenAt e planta murcha quando o streak quebra', async () => {
    const { token: parentToken } = await registerParent(app);
    const { child, username, password } = await createChild(app, parentToken);
    const childAuth = await login(app, username, password);

    const task = await request(app.getHttpServer())
      .post('/api/tasks')
      .set(authHeader(parentToken))
      .send({ title: 'Guardar o material', iconEmoji: '📚' })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/tasks/${task.body.id}/complete`)
      .set(authHeader(childAuth.token))
      .expect(200);

    const growing = await request(app.getHttpServer())
      .get('/api/streaks')
      .set(authHeader(childAuth.token))
      .expect(200);
    expect(growing.body.currentStreak).toBe(1);
    expect(growing.body.plant.state).toBe('healthy');

    const penalty = await request(app.getHttpServer())
      .post('/api/penalties')
      .set(authHeader(parentToken))
      .send({ title: 'Não cumpriu combinado', emoji: '⚠️', amount: 1 })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/penalties/apply')
      .set(authHeader(parentToken))
      .send({ penaltyId: penalty.body.id, childId: child.id })
      .expect(201);

    const broken = await request(app.getHttpServer())
      .get('/api/streaks')
      .set(authHeader(childAuth.token))
      .expect(200);
    expect(broken.body.currentStreak).toBe(0);
    expect(broken.body.streakBrokenAt).toBe(today());
    expect(broken.body.plant.state).toBe('withered');
  });
});

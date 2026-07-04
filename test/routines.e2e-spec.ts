import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import {
  authHeader,
  createChild,
  login,
  registerParent,
} from './utils/fixtures';

describe('Routines & Routine Templates (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responsável cria uma rotina e ela aparece para a criança', async () => {
    const { token } = await registerParent(app);
    const { username, password } = await createChild(app, token);
    const childAuth = await login(app, username, password);

    const routine = await request(app.getHttpServer())
      .post('/api/routines')
      .set(authHeader(token))
      .send({ name: 'Manhã', emoji: '🌅', timeOfDay: 'morning' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/api/routines')
      .set(authHeader(childAuth.token))
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(routine.body.id);
    expect(res.body[0].completedToday).toBe(false);
  });

  it('responsável cria rotina sem pontos para uma criança e com dias da semana', async () => {
    const { token } = await registerParent(app);
    const firstChild = await createChild(app, token, { name: 'Filho A' });
    const secondChild = await createChild(app, token, { name: 'Filho B' });
    const childAuth = await login(
      app,
      firstChild.username,
      firstChild.password,
    );

    const routine = await request(app.getHttpServer())
      .post('/api/routines')
      .set(authHeader(token))
      .send({
        childId: firstChild.child.id,
        name: 'Escovar dentes',
        emoji: '🦷',
        timeOfDay: 'morning',
        scheduledTime: '07:30',
        recurrenceDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      })
      .expect(201);

    expect(routine.body.childId).toBe(firstChild.child.id);
    expect(routine.body.recurrenceDays).toEqual([
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
    ]);
    expect(routine.body.rewardStars).toBeUndefined();

    const firstList = await request(app.getHttpServer())
      .get('/api/routines')
      .set(authHeader(token))
      .query({ childId: firstChild.child.id })
      .expect(200);
    expect(firstList.body.map((item) => item.id)).toContain(routine.body.id);

    const secondList = await request(app.getHttpServer())
      .get('/api/routines')
      .set(authHeader(token))
      .query({ childId: secondChild.child.id })
      .expect(200);
    expect(secondList.body.map((item) => item.id)).not.toContain(
      routine.body.id,
    );

    await request(app.getHttpServer())
      .patch(`/api/routines/${routine.body.id}/complete`)
      .set(authHeader(childAuth.token))
      .expect(200);

    const stars = await request(app.getHttpServer())
      .get('/api/stars')
      .set(authHeader(token))
      .query({ childId: firstChild.child.id })
      .expect(200);
    expect(stars.body.currentStars).toBe(0);
  });

  it('criança completa e desmarca a rotina do dia', async () => {
    const { token } = await registerParent(app);
    const { username, password } = await createChild(app, token);
    const childAuth = await login(app, username, password);
    const routine = await request(app.getHttpServer())
      .post('/api/routines')
      .set(authHeader(token))
      .send({ name: 'Noite', emoji: '🌙', timeOfDay: 'night' })
      .expect(201);

    const completed = await request(app.getHttpServer())
      .patch(`/api/routines/${routine.body.id}/complete`)
      .set(authHeader(childAuth.token))
      .expect(200);
    expect(completed.body.completedToday).toBe(true);

    const progress = await request(app.getHttpServer())
      .get('/api/routines/progress/today')
      .set(authHeader(childAuth.token))
      .expect(200);
    expect(progress.body.completed).toBe(1);
    expect(progress.body.total).toBe(1);

    const uncompleted = await request(app.getHttpServer())
      .patch(`/api/routines/${routine.body.id}/uncomplete`)
      .set(authHeader(childAuth.token))
      .expect(200);
    expect(uncompleted.body.completedToday).toBe(false);
  });

  it('remove uma rotina da família', async () => {
    const { token } = await registerParent(app);
    const { child } = await createChild(app, token);
    const routine = await request(app.getHttpServer())
      .post('/api/routines')
      .set(authHeader(token))
      .send({ name: 'Temporária', emoji: '⏳' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/routines/${routine.body.id}`)
      .set(authHeader(token))
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/api/routines')
      .set(authHeader(token))
      .query({ childId: child.id })
      .expect(200);
    expect(res.body).toHaveLength(0);
  });

  describe('templates de rotina', () => {
    it('cria um template e instancia como tarefas + agenda do dia', async () => {
      const { token } = await registerParent(app);
      const { child } = await createChild(app, token);

      const template = await request(app.getHttpServer())
        .post('/api/routine-templates')
        .set(authHeader(token))
        .send({
          name: 'Rotina escolar',
          emoji: '🎒',
          tasks: [
            { title: 'Arrumar a mochila', iconEmoji: '🎒' },
            { title: 'Fazer lição', iconEmoji: '📝' },
          ],
        })
        .expect(201);
      expect(template.body.tasks).toHaveLength(2);

      const instantiated = await request(app.getHttpServer())
        .post(`/api/routine-templates/${template.body.id}/instantiate`)
        .set(authHeader(token))
        .send({ childId: child.id })
        .expect(201);

      expect(instantiated.body.tasksCreated).toBe(2);
      expect(instantiated.body.scheduled).toBe(2);

      const tasks = await request(app.getHttpServer())
        .get('/api/tasks')
        .set(authHeader(token))
        .query({ childId: child.id })
        .expect(200);
      expect(tasks.body).toHaveLength(2);
    });

    it('instanciar o mesmo template duas vezes no mesmo dia não duplica tarefas', async () => {
      const { token } = await registerParent(app);
      const { child } = await createChild(app, token);

      const template = await request(app.getHttpServer())
        .post('/api/routine-templates')
        .set(authHeader(token))
        .send({ name: 'Rotina', tasks: [{ title: 'Tarefa única' }] })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/routine-templates/${template.body.id}/instantiate`)
        .set(authHeader(token))
        .send({ childId: child.id })
        .expect(201);

      const second = await request(app.getHttpServer())
        .post(`/api/routine-templates/${template.body.id}/instantiate`)
        .set(authHeader(token))
        .send({ childId: child.id })
        .expect(201);
      expect(second.body.tasksCreated).toBe(0);
      expect(second.body.scheduled).toBe(0);
    });

    it('exige pelo menos uma tarefa no template', async () => {
      const { token } = await registerParent(app);
      await request(app.getHttpServer())
        .post('/api/routine-templates')
        .set(authHeader(token))
        .send({ name: 'Vazio', tasks: [] })
        .expect(400);
    });
  });
});

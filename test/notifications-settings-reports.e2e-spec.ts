import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from './utils/test-app';
import {
  registerParent,
  createChild,
  createLinkedTherapist,
  login,
  authHeader,
  AuthedUser,
  ChildFixture,
} from './utils/fixtures';

describe('Notificações, Configurações e Relatórios (e2e)', () => {
  let app: INestApplication;
  let parent: AuthedUser;
  let child: AuthedUser;
  let therapist: AuthedUser;
  let childFixture: ChildFixture;
  let childId: string;

  beforeAll(async () => {
    app = await createTestApp();
    parent = await registerParent(app);
    childFixture = await createChild(app, parent.token);
    childId = childFixture.child.id;
    child = await login(app, childFixture.username, childFixture.password);
    therapist = await createLinkedTherapist(app, parent.token, childId);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('configurações da penalidade da meia-noite', () => {
    it('nascem com defaults seguros (penalidade ativa, 1 estrela)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/settings')
        .set(authHeader(parent.token))
        .expect(200);
      expect(res.body).toMatchObject({
        applyDailyPenalty: true,
        dailyPenaltyStars: 1,
      });
    });

    it('responsável ajusta; validação estrita rejeita valores fora do limite', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/settings')
        .set(authHeader(parent.token))
        .send({ dailyPenaltyStars: 3, applyDailyPenalty: false })
        .expect(200);
      expect(res.body.dailyPenaltyStars).toBe(3);
      expect(res.body.applyDailyPenalty).toBe(false);

      await request(app.getHttpServer())
        .patch('/api/settings')
        .set(authHeader(parent.token))
        .send({ dailyPenaltyStars: 50 })
        .expect(400);
    });

    it('criança não acessa as configurações (403)', async () => {
      await request(app.getHttpServer())
        .get('/api/settings')
        .set(authHeader(child.token))
        .expect(403);
    });
  });

  describe('notificações inteligentes', () => {
    it('sugestão da terapeuta gera notificação para o responsável', async () => {
      await request(app.getHttpServer())
        .post('/api/stars/suggest')
        .set(authHeader(therapist.token))
        .send({ childId, amount: 2, reason: 'Ótima participação na sessão' })
        .expect(201);

      const unread = await request(app.getHttpServer())
        .get('/api/notifications/unread-count')
        .set(authHeader(parent.token))
        .expect(200);
      expect(unread.body.unread).toBeGreaterThanOrEqual(1);

      const list = await request(app.getHttpServer())
        .get('/api/notifications')
        .set(authHeader(parent.token))
        .expect(200);
      const approval = list.body.find(
        (n: { type: string }) => n.type === 'approval_pending',
      );
      expect(approval).toBeDefined();
      expect(approval.title).toContain('aguardando aprovação');
    });

    it('marcar todas como lidas zera o contador', async () => {
      await request(app.getHttpServer())
        .patch('/api/notifications/read-all')
        .set(authHeader(parent.token))
        .expect(200);

      const unread = await request(app.getHttpServer())
        .get('/api/notifications/unread-count')
        .set(authHeader(parent.token))
        .expect(200);
      expect(unread.body.unread).toBe(0);
    });

    it('cada usuário só vê as próprias notificações', async () => {
      const childList = await request(app.getHttpServer())
        .get('/api/notifications')
        .set(authHeader(child.token))
        .expect(200);
      const hasParentNotification = childList.body.some(
        (n: { type: string }) => n.type === 'approval_pending',
      );
      expect(hasParentNotification).toBe(false);
    });
  });

  describe('relatórios (compile + CSV)', () => {
    beforeAll(async () => {
      // Gera atividade: nota clínica + aprovação da bonificação pendente
      await request(app.getHttpServer())
        .post('/api/observations')
        .set(authHeader(therapist.token))
        .send({ childId, type: 'clinical', text: 'Sessão produtiva e tranquila' })
        .expect(201);

      const pending = await request(app.getHttpServer())
        .get('/api/stars/requests')
        .set(authHeader(parent.token))
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/api/stars/approve/${pending.body[0].id}`)
        .set(authHeader(parent.token))
        .expect(200);
    });

    it('compile devolve totais e eventos mesclados (histórico + notas)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reports/compile?childId=${childId}&days=7`)
        .set(authHeader(parent.token))
        .expect(200);

      expect(res.body.child.name).toBe(childFixture.child.name);
      expect(res.body.totals.observations).toBe(1);
      expect(res.body.totals.starsEarned).toBeGreaterThanOrEqual(2);
      const categories = res.body.events.map((e: { category: string }) => e.category);
      expect(categories).toContain('Nota clínica');
      expect(categories).toContain('Estrelas recebidas');
    });

    it('terapeuta também exporta; CSV vem como download com cabeçalho', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reports/export.csv?childId=${childId}&days=7`)
        .set(authHeader(therapist.token))
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.text).toContain('Data/Hora');
      expect(res.text).toContain('Nota clínica');
    });

    it('criança não acessa relatórios (403)', async () => {
      await request(app.getHttpServer())
        .get(`/api/reports/compile?childId=${childId}`)
        .set(authHeader(child.token))
        .expect(403);
    });
  });
});

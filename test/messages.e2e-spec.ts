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

describe('Messages (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function setupChildWithTeacherAndTherapist() {
    const { token: parentToken } = await registerParent(app);
    const { child } = await createChild(app, parentToken);
    const teacher = await createLinkedTeacher(app, child);
    const therapist = await createLinkedTherapist(app, parentToken, child.id);
    return { parentToken, child, teacher, therapist };
  }

  it('professor e terapeuta aparecem como contatos um do outro', async () => {
    const { child, teacher, therapist } =
      await setupChildWithTeacherAndTherapist();

    const teacherContacts = await request(app.getHttpServer())
      .get('/api/messages/contacts')
      .set(authHeader(teacher.token))
      .query({ childId: child.id })
      .expect(200);
    expect(teacherContacts.body).toHaveLength(1);
    expect(teacherContacts.body[0].role).toBe('therapist');

    const therapistContacts = await request(app.getHttpServer())
      .get('/api/messages/contacts')
      .set(authHeader(therapist.token))
      .query({ childId: child.id })
      .expect(200);
    expect(therapistContacts.body).toHaveLength(1);
    expect(therapistContacts.body[0].role).toBe('teacher');
  });

  it('troca mensagens e marca como lida ao abrir o thread', async () => {
    const { child, teacher, therapist } =
      await setupChildWithTeacherAndTherapist();

    await request(app.getHttpServer())
      .post('/api/messages')
      .set(authHeader(teacher.token))
      .send({
        childId: child.id,
        recipientId: therapist.user.id,
        text: 'Como foi a sessão hoje?',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/messages')
      .set(authHeader(therapist.token))
      .send({
        childId: child.id,
        recipientId: teacher.user.id,
        text: 'Foi ótima!',
      })
      .expect(201);

    const unreadBefore = await request(app.getHttpServer())
      .get('/api/messages/unread-count')
      .set(authHeader(teacher.token))
      .expect(200);
    expect(unreadBefore.body.unread).toBe(1);

    const thread = await request(app.getHttpServer())
      .get('/api/messages/thread')
      .set(authHeader(teacher.token))
      .query({ childId: child.id, withUserId: therapist.user.id })
      .expect(200);
    expect(thread.body).toHaveLength(2);

    const unreadAfter = await request(app.getHttpServer())
      .get('/api/messages/unread-count')
      .set(authHeader(teacher.token))
      .expect(200);
    expect(unreadAfter.body.unread).toBe(0);
  });

  it('rejeita mensagem para si mesmo', async () => {
    const { child, teacher } = await setupChildWithTeacherAndTherapist();

    await request(app.getHttpServer())
      .post('/api/messages')
      .set(authHeader(teacher.token))
      .send({
        childId: child.id,
        recipientId: teacher.user.id,
        text: 'Oi eu mesmo',
      })
      .expect(400);
  });

  it('responsável e criança não têm acesso ao canal de mensagens', async () => {
    const { parentToken } = await setupChildWithTeacherAndTherapist();

    await request(app.getHttpServer())
      .get('/api/messages/unread-count')
      .set(authHeader(parentToken))
      .expect(403);
  });

  it('bloqueia mensagem quando destinatário não está vinculado à mesma criança', async () => {
    const { child, teacher } = await setupChildWithTeacherAndTherapist();
    const outroPai = await registerParent(app);
    const { child: outraCrianca } = await createChild(app, outroPai.token);
    const outraTherapist = await createLinkedTherapist(
      app,
      outroPai.token,
      outraCrianca.id,
    );

    await request(app.getHttpServer())
      .post('/api/messages')
      .set(authHeader(teacher.token))
      .send({
        childId: child.id,
        recipientId: outraTherapist.user.id,
        text: 'Não deveria enviar',
      })
      .expect(403);
  });
});

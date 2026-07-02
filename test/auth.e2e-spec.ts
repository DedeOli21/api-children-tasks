import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import {
  authHeader,
  createChild,
  registerParent,
  uniqueEmail,
} from './utils/fixtures';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('registra um responsável e retorna token + usuário sem senha', async () => {
      const email = uniqueEmail('parent');
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name: 'Maria', email, password: 'senha123' })
        .expect(201);

      expect(res.body.access_token).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({
        name: 'Maria',
        email,
        role: 'parent',
      });
      expect(res.body.user.password).toBeUndefined();
    });

    it('registra um professor quando role=teacher é informado', async () => {
      const email = uniqueEmail('teacher');
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name: 'Ana', email, password: 'senha123', role: 'teacher' })
        .expect(201);

      expect(res.body.user.role).toBe('teacher');
    });

    it('rejeita role=child no cadastro público (apenas parent/teacher)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'X',
          email: uniqueEmail('x'),
          password: 'senha123',
          role: 'child',
        })
        .expect(400);
    });

    it('rejeita email duplicado com 409', async () => {
      const email = uniqueEmail('dup');
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name: 'Primeiro', email, password: 'senha123' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name: 'Segundo', email, password: 'outrasenha' })
        .expect(409);
    });

    it('valida campos obrigatórios e formato de email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name: '', email: 'nao-e-email', password: '123' })
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('autentica com credenciais corretas', async () => {
      const email = uniqueEmail('login');
      const password = 'senha123';
      await registerParent(app, { email, password });

      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password })
        .expect(201);

      expect(res.body.access_token).toEqual(expect.any(String));
      expect(res.body.user.email).toBe(email);
    });

    it('rejeita senha incorreta com 401', async () => {
      const email = uniqueEmail('badpass');
      await registerParent(app, { email, password: 'senha123' });

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'senhaerrada' })
        .expect(401);
    });

    it('rejeita usuário inexistente com 401', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: uniqueEmail('inexistente'), password: 'qualquer123' })
        .expect(401);
    });

    it('permite login da criança usando username no campo email', async () => {
      const { token: parentToken } = await registerParent(app);
      const { username, password } = await createChild(app, parentToken);

      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: username, password })
        .expect(201);

      expect(res.body.user.role).toBe('child');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('retorna o perfil do usuário autenticado', async () => {
      const { token, user } = await registerParent(app);

      const res = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set(authHeader(token))
        .expect(200);

      expect(res.body.id).toBe(user.id);
      expect(res.body.password).toBeUndefined();
    });

    it('sem token responde 401', async () => {
      await request(app.getHttpServer()).get('/api/auth/profile').expect(401);
    });

    it('com token inválido responde 401', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set(authHeader('token-invalido'))
        .expect(401);
    });
  });
});

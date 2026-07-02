import request from 'supertest';
import { INestApplication } from '@nestjs/common';

// Contador simples garante emails/usuários únicos mesmo quando vários testes
// rodam no mesmo arquivo (mesma app / mesmo banco em memória).
let seq = 0;
function nextSeq(): number {
  seq += 1;
  return seq;
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${nextSeq()}@example.com`;
}

export function uniqueUsername(prefix: string): string {
  return `${prefix}${nextSeq()}`;
}

export interface AuthedUser {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    [key: string]: unknown;
  };
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

export async function registerParent(
  app: INestApplication,
  overrides: Partial<{ name: string; email: string; password: string }> = {},
): Promise<AuthedUser> {
  const payload = {
    name: overrides.name ?? 'Responsável Teste',
    email: overrides.email ?? uniqueEmail('parent'),
    password: overrides.password ?? 'senha123',
    role: 'parent' as const,
  };
  const res = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send(payload)
    .expect(201);
  return { token: res.body.access_token, user: res.body.user };
}

export async function registerTeacher(
  app: INestApplication,
  overrides: Partial<{ name: string; email: string; password: string }> = {},
): Promise<AuthedUser> {
  const payload = {
    name: overrides.name ?? 'Professor(a) Teste',
    email: overrides.email ?? uniqueEmail('teacher'),
    password: overrides.password ?? 'senha123',
    role: 'teacher' as const,
  };
  const res = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send(payload)
    .expect(201);
  return { token: res.body.access_token, user: res.body.user };
}

export interface ChildFixture {
  child: {
    id: string;
    name: string;
    username: string;
    inviteCode: string;
    currentStars: number;
    currentStreak: number;
  };
  username: string;
  password: string;
}

export async function createChild(
  app: INestApplication,
  parentToken: string,
  overrides: Partial<{ name: string; username: string; password: string }> = {},
): Promise<ChildFixture> {
  const payload = {
    name: overrides.name ?? 'Criança Teste',
    username: overrides.username ?? uniqueUsername('child'),
    password: overrides.password ?? 'pin1234',
  };
  const res = await request(app.getHttpServer())
    .post('/api/children')
    .set(authHeader(parentToken))
    .send(payload)
    .expect(201);
  return {
    child: res.body,
    username: payload.username,
    password: payload.password,
  };
}

// Login usa o mesmo endpoint para responsável/professor (email) e criança
// (username no campo "email").
export async function login(
  app: INestApplication,
  email: string,
  password: string,
): Promise<AuthedUser> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(201);
  return { token: res.body.access_token, user: res.body.user };
}

// Cria terapeuta vinculada à criança a partir do responsável e já retorna
// o login da terapeuta pronta para uso.
export async function createLinkedTherapist(
  app: INestApplication,
  parentToken: string,
  childId: string,
  overrides: Partial<{ name: string; email: string; password: string }> = {},
): Promise<AuthedUser> {
  const email = overrides.email ?? uniqueEmail('therapist');
  const password = overrides.password ?? 'senha123';
  await request(app.getHttpServer())
    .post('/api/therapists')
    .set(authHeader(parentToken))
    .send({
      childId,
      email,
      name: overrides.name ?? 'Terapeuta Teste',
      password,
    })
    .expect(201);
  return login(app, email, password);
}

// Cria professor(a) e já vincula à criança via código de convite.
export async function createLinkedTeacher(
  app: INestApplication,
  child: ChildFixture['child'],
  overrides: Partial<{ name: string; email: string; password: string }> = {},
): Promise<AuthedUser> {
  const teacher = await registerTeacher(app, overrides);
  await request(app.getHttpServer())
    .post('/api/teacher/students')
    .set(authHeader(teacher.token))
    .send({ inviteCode: child.inviteCode })
    .expect(201);
  return teacher;
}

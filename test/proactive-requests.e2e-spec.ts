import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import {
  authHeader,
  createChild,
  login,
  registerParent,
} from './utils/fixtures';
import {
  PetAttachmentSlot,
  PetDrop,
  PetDropRule,
  PetDropSourceType,
  PetInventoryItem,
  PetItem,
  PetItemRarity,
  PetItemType,
} from '../src/entities';

describe('ProactiveRequests (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let seq = 0;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  async function setupFamily() {
    const parent = await registerParent(app);
    const { child, username, password } = await createChild(app, parent.token);
    const childAuth = await login(app, username, password);

    return { parent, child, childAuth };
  }

  async function createProactiveRequest(childToken: string, overrides = {}) {
    const res = await request(app.getHttpServer())
      .post('/api/proactive-requests')
      .set(authHeader(childToken))
      .send({
        categoryIcon: 'studies',
        description: 'Li um livro sem ninguém pedir',
        suggestedStars: 4,
        ...overrides,
      })
      .expect(201);

    return res.body;
  }

  async function seedProactiveDrop() {
    seq += 1;
    const petItem = await dataSource.getRepository(PetItem).save(
      dataSource.getRepository(PetItem).create({
        key: `proactive-drop-${seq}`,
        name: `Iniciativa ${seq}`,
        type: PetItemType.EFFECT,
        attachmentSlot: PetAttachmentSlot.EFFECT,
        attachmentKey: `initiative_sparkle_${seq}`,
        previewEmoji: '✨',
        rarity: PetItemRarity.RARE,
        active: true,
      }),
    );

    await dataSource.getRepository(PetDropRule).save(
      dataSource.getRepository(PetDropRule).create({
        sourceType: PetDropSourceType.PROACTIVE_REQUEST,
        rarity: PetItemRarity.RARE,
        chanceBasisPoints: 10_000,
        active: true,
      }),
    );

    return petItem;
  }

  it('criança envia uma Super Iniciativa e responsável vê na fila pendente', async () => {
    const { parent, child, childAuth } = await setupFamily();

    const created = await createProactiveRequest(childAuth.token);
    expect(created.childId).toBe(child.id);
    expect(created.familyId).toBe(parent.user.id);
    expect(created.status).toBe('pending');
    expect(created.categoryEmoji).toBe('📚');

    const pending = await request(app.getHttpServer())
      .get('/api/proactive-requests/pending')
      .set(authHeader(parent.token))
      .expect(200);

    expect(pending.body).toHaveLength(1);
    expect(pending.body[0].id).toBe(created.id);
    expect(pending.body[0].childName).toBe(child.name);
  });

  it('responsável aprova com valor sugerido e credita estrelas uma única vez', async () => {
    const expectedItem = await seedProactiveDrop();
    const { parent, child, childAuth } = await setupFamily();
    const created = await createProactiveRequest(childAuth.token);

    const approved = await request(app.getHttpServer())
      .patch(`/api/proactive-requests/${created.id}/approve`)
      .set(authHeader(parent.token))
      .expect(200);

    expect(approved.body.status).toBe('approved');
    expect(approved.body.finalStars).toBe(4);
    expect(approved.body.starsEarned).toBe(4);
    expect(approved.body.currentStars).toBe(4);
    expect(approved.body.petReward.drop).toMatchObject({
      dropped: true,
      item: {
        id: expectedItem.id,
        key: expectedItem.key,
      },
    });

    const inventory = await dataSource.getRepository(PetInventoryItem).findOne({
      where: { childId: child.id, petItemId: expectedItem.id },
    });
    expect(inventory).toMatchObject({ acquisitionSource: 'drop' });

    const drop = await dataSource.getRepository(PetDrop).findOne({
      where: {
        childId: child.id,
        petItemId: expectedItem.id,
        sourceType: PetDropSourceType.PROACTIVE_REQUEST,
      },
    });
    expect(drop?.sourceId).toBe(created.id);

    await request(app.getHttpServer())
      .patch(`/api/proactive-requests/${created.id}/approve`)
      .set(authHeader(parent.token))
      .expect(400);

    const stars = await request(app.getHttpServer())
      .get('/api/stars')
      .set(authHeader(parent.token))
      .query({ childId: child.id })
      .expect(200);
    expect(stars.body.currentStars).toBe(4);
  });

  it('responsável ajusta o valor final antes de creditar', async () => {
    const { parent, child, childAuth } = await setupFamily();
    const created = await createProactiveRequest(childAuth.token, {
      categoryIcon: 'organization',
      description: 'Organizei meus brinquedos e separei roupas',
      suggestedStars: 3,
    });

    const adjusted = await request(app.getHttpServer())
      .patch(`/api/proactive-requests/${created.id}/approve`)
      .set(authHeader(parent.token))
      .send({ finalStars: 6 })
      .expect(200);

    expect(adjusted.body.status).toBe('adjusted');
    expect(adjusted.body.finalStars).toBe(6);
    expect(adjusted.body.categoryEmoji).toBe('🏠');
    expect(adjusted.body.currentStars).toBe(6);

    const history = await request(app.getHttpServer())
      .get('/api/history')
      .set(authHeader(parent.token))
      .query({ childId: child.id })
      .expect(200);
    expect(history.body[0]).toMatchObject({
      type: 'stars_add',
      starsChange: 6,
    });
    expect(history.body[0].description).toContain('Super Iniciativa');
  });

  it('responsável recusa sem alterar o saldo', async () => {
    const { parent, child, childAuth } = await setupFamily();
    const created = await createProactiveRequest(childAuth.token, {
      suggestedStars: 5,
    });

    const rejected = await request(app.getHttpServer())
      .patch(`/api/proactive-requests/${created.id}/reject`)
      .set(authHeader(parent.token))
      .expect(200);

    expect(rejected.body.status).toBe('rejected');
    expect(rejected.body.finalStars).toBe(0);
    expect(rejected.body.starsEarned).toBe(0);

    const stars = await request(app.getHttpServer())
      .get('/api/stars')
      .set(authHeader(parent.token))
      .query({ childId: child.id })
      .expect(200);
    expect(stars.body.currentStars).toBe(0);
  });

  it('impede responsável de outra família revisar a solicitação', async () => {
    const { childAuth } = await setupFamily();
    const outsiderParent = await registerParent(app);
    const created = await createProactiveRequest(childAuth.token);

    await request(app.getHttpServer())
      .patch(`/api/proactive-requests/${created.id}/approve`)
      .set(authHeader(outsiderParent.token))
      .send({})
      .expect(404);
  });

  it('bloqueia papéis indevidos no envio e na revisão', async () => {
    const { parent, childAuth } = await setupFamily();
    const created = await createProactiveRequest(childAuth.token);

    await request(app.getHttpServer())
      .post('/api/proactive-requests')
      .set(authHeader(parent.token))
      .send({
        categoryIcon: 'studies',
        description: 'Adulto não deveria enviar',
        suggestedStars: 2,
      })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/proactive-requests/${created.id}/approve`)
      .set(authHeader(childAuth.token))
      .send({})
      .expect(403);
  });

  it('valida categoria, descrição e faixa de estrelas sugeridas', async () => {
    const { childAuth } = await setupFamily();

    await request(app.getHttpServer())
      .post('/api/proactive-requests')
      .set(authHeader(childAuth.token))
      .send({
        categoryIcon: 'sports',
        description: 'ok',
        suggestedStars: 99,
      })
      .expect(400);
  });
});

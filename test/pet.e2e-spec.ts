import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from './utils/test-app';
import {
  registerParent,
  createChild,
  createLinkedTeacher,
  login,
  authHeader,
  AuthedUser,
  ChildFixture,
} from './utils/fixtures';

describe('Pet Virtual (e2e)', () => {
  let app: INestApplication;
  let parent: AuthedUser;
  let child: AuthedUser;
  let childFixture: ChildFixture;
  let childId: string;
  let waterItemId: string;
  let skinItemId: string;

  beforeAll(async () => {
    app = await createTestApp();

    parent = await registerParent(app);
    childFixture = await createChild(app, parent.token);
    childId = childFixture.child.id;
    child = await login(app, childFixture.username, childFixture.password);
  });

  afterAll(async () => {
    await app.close();
  });

  it('cria a planta no primeiro acesso, com níveis iniciais e estágio semente', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/pet')
      .set(authHeader(child.token))
      .expect(200);

    expect(res.body).toMatchObject({
      childId,
      name: 'Plantinha',
      waterLevel: 80,
      nutritionLevel: 80,
      xp: 0,
      level: 1,
      xpToNextLevel: 100,
      modelKey: 'plant_v1',
      animationState: 'idle',
      equippedItems: {},
      stage: 'seed',
      mood: 'happy',
    });
    expect(res.body.skin).toBeNull();
  });

  it('a criança batiza a planta', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/pet/name')
      .set(authHeader(child.token))
      .send({ name: 'Florzinha' })
      .expect(200);
    expect(res.body.name).toBe('Florzinha');
  });

  it('responsável cria itens da Economia Botânica; catálogo aparece para a criança', async () => {
    const water = await request(app.getHttpServer())
      .post('/api/pet/shop-items')
      .set(authHeader(parent.token))
      .send({
        type: 'water',
        name: 'Gota Mágica',
        emoji: '💧',
        price: 2,
        restoreAmount: 30,
      })
      .expect(201);
    waterItemId = water.body.id;

    const skin = await request(app.getHttpServer())
      .post('/api/pet/shop-items')
      .set(authHeader(parent.token))
      .send({ type: 'skin', name: 'Cacto Teste', emoji: '🌵', price: 5 })
      .expect(201);
    skinItemId = skin.body.id;

    const catalog = await request(app.getHttpServer())
      .get('/api/pet/shop')
      .set(authHeader(child.token))
      .expect(200);
    const ids = catalog.body.map((item: { id: string }) => item.id);
    expect(ids).toContain(waterItemId);
    expect(ids).toContain(skinItemId);
  });

  it('consumível sem restoreAmount é rejeitado (validação estrita)', async () => {
    await request(app.getHttpServer())
      .post('/api/pet/shop-items')
      .set(authHeader(parent.token))
      .send({ type: 'food', name: 'Adubo Quebrado', price: 2 })
      .expect(400);
  });

  it('compra sem saldo falha e NADA é debitado (transação)', async () => {
    await request(app.getHttpServer())
      .post(`/api/pet/shop/${waterItemId}/buy`)
      .set(authHeader(child.token))
      .expect(400);

    const stars = await request(app.getHttpServer())
      .get('/api/stars')
      .set(authHeader(child.token))
      .expect(200);
    expect(stars.body.currentStars).toBe(0);

    const inventory = await request(app.getHttpServer())
      .get('/api/pet/inventory')
      .set(authHeader(child.token))
      .expect(200);
    expect(inventory.body).toHaveLength(0);
  });

  it('com saldo, compra debita e itens consumíveis empilham', async () => {
    // Responsável concede estrelas para o teste
    await request(app.getHttpServer())
      .patch('/api/stars/add')
      .set(authHeader(parent.token))
      .send({ childId, amount: 20 })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/pet/shop/${waterItemId}/buy`)
      .set(authHeader(child.token))
      .expect(201);
    const second = await request(app.getHttpServer())
      .post(`/api/pet/shop/${waterItemId}/buy`)
      .set(authHeader(child.token))
      .expect(201);

    expect(second.body.quantity).toBe(2);
    expect(second.body.currentStars).toBe(16); // 20 - 2 - 2
  });

  it('cosmético não pode ser comprado duas vezes', async () => {
    await request(app.getHttpServer())
      .post(`/api/pet/shop/${skinItemId}/buy`)
      .set(authHeader(child.token))
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/pet/shop/${skinItemId}/buy`)
      .set(authHeader(child.token))
      .expect(400);
  });

  it('regar consome o item, restaura água (cap 100) e rende XP', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/pet/care')
      .set(authHeader(child.token))
      .send({ shopItemId: waterItemId })
      .expect(201);

    expect(res.body.waterLevel).toBe(100); // 80 + 30, capado em 100
    expect(res.body.xp).toBe(5);
    expect(res.body.remaining).toBe(1);

    // Planta cheia recusa mais água (e não desperdiça o item)
    await request(app.getHttpServer())
      .post('/api/pet/care')
      .set(authHeader(child.token))
      .send({ shopItemId: waterItemId })
      .expect(400);
  });

  it('equipar skin marca equipped; consumível não é equipável', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/pet/inventory/${skinItemId}/equip`)
      .set(authHeader(child.token))
      .expect(200);
    expect(res.body.equipped).toBe(true);

    const pet = await request(app.getHttpServer())
      .get('/api/pet')
      .set(authHeader(child.token))
      .expect(200);
    expect(pet.body.skin).toMatchObject({ name: 'Cacto Teste' });

    await request(app.getHttpServer())
      .patch(`/api/pet/inventory/${waterItemId}/equip`)
      .set(authHeader(child.token))
      .expect(400);
  });

  it('RBAC: responsável observa o pet; professor não acessa; criança não gerencia a loja', async () => {
    const asParent = await request(app.getHttpServer())
      .get(`/api/pet?childId=${childId}`)
      .set(authHeader(parent.token))
      .expect(200);
    expect(asParent.body.name).toBe('Florzinha');

    const teacher = await createLinkedTeacher(app, childFixture.child);
    await request(app.getHttpServer())
      .get(`/api/pet?childId=${childId}`)
      .set(authHeader(teacher.token))
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/pet/shop-items')
      .set(authHeader(child.token))
      .send({ type: 'skin', name: 'Hack', price: 1 })
      .expect(403);

    // Catálogo padrão é imutável até para o responsável
    await request(app.getHttpServer())
      .patch(`/api/pet/shop-items/${'00000000-0000-0000-0000-000000000000'}`)
      .set(authHeader(parent.token))
      .send({ price: 1 })
      .expect(404);
  });
});

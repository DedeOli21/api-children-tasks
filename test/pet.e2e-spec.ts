import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
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
import {
  PetAttachmentSlot,
  FeatureFlag,
  PetDropRule,
  PetDropSourceType,
  PetInventoryItem,
  PetItem,
  PetItemAcquisitionSource,
  PetItemRarity,
  PetItemType,
} from '../src/entities';
import {
  DEFAULT_PET_ITEM_KEYS,
  PetCatalogSeedService,
} from '../src/pet-rewards/pet-catalog-seed.service';

describe('Pet Virtual (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let parent: AuthedUser;
  let child: AuthedUser;
  let childFixture: ChildFixture;
  let childId: string;
  let waterItemId: string;
  let skinItemId: string;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);

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

  it('exibe e equipa drops modernos como attachments do Pet', async () => {
    const petItem = await dataSource.getRepository(PetItem).save(
      dataSource.getRepository(PetItem).create({
        key: 'drop-hat-test',
        name: 'Boné de Vitória',
        type: PetItemType.HAT,
        attachmentSlot: PetAttachmentSlot.HEAD,
        attachmentKey: 'hat_victory',
        previewEmoji: '🧢',
        rarity: PetItemRarity.RARE,
        active: true,
      }),
    );
    const inventoryItem = await dataSource.getRepository(PetInventoryItem).save(
      dataSource.getRepository(PetInventoryItem).create({
        childId,
        petItemId: petItem.id,
        quantity: 1,
        acquisitionSource: PetItemAcquisitionSource.DROP,
        acquiredAt: new Date(),
      }),
    );

    const inventory = await request(app.getHttpServer())
      .get('/api/pet/inventory')
      .set(authHeader(child.token))
      .expect(200);
    expect(inventory.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'pet_item',
          inventoryItemId: inventoryItem.id,
          petItemId: petItem.id,
          attachmentSlot: 'head',
          attachmentKey: 'hat_victory',
          equipped: false,
        }),
      ]),
    );

    const equipped = await request(app.getHttpServer())
      .patch(`/api/pet/inventory/${petItem.id}/equip`)
      .set(authHeader(child.token))
      .expect(200);
    expect(equipped.body).toMatchObject({
      inventoryItemId: inventoryItem.id,
      petItemId: petItem.id,
      equipped: true,
      equippedSlot: 'head',
      equippedItems: { head: 'hat_victory' },
    });

    const pet = await request(app.getHttpServer())
      .get('/api/pet')
      .set(authHeader(child.token))
      .expect(200);
    expect(pet.body.equippedItems).toMatchObject({ head: 'hat_victory' });
    expect(pet.body.equippedAttachments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          petItemId: petItem.id,
          attachmentKey: 'hat_victory',
          equipped: true,
        }),
      ]),
    );
  });

  it('semeia catalogo padrao de itens e regras de drop do Pet sem duplicar', async () => {
    const seeder = app.get(PetCatalogSeedService);

    const firstRun = await seeder.ensureCatalog();
    const secondRun = await seeder.ensureCatalog();

    expect(firstRun.createdItems).toBeGreaterThan(0);
    expect(firstRun.createdRules).toBeGreaterThan(0);
    expect(secondRun.createdItems).toBe(0);
    expect(secondRun.createdRules).toBe(0);

    const items = await dataSource.getRepository(PetItem).find({
      where: { key: In([...DEFAULT_PET_ITEM_KEYS]) },
    });
    expect(items).toHaveLength(DEFAULT_PET_ITEM_KEYS.length);
    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'species_cat_orange',
          type: PetItemType.SPECIES,
          attachmentSlot: PetAttachmentSlot.SPECIES,
          attachmentKey: 'cat_orange',
          assetUrl: '/assets/cat_idle_happy.jpg',
        }),
        expect.objectContaining({
          key: 'background_backyard',
          type: PetItemType.BACKGROUND,
          attachmentKey: 'backyard',
          assetUrl: '/assets/bg_backyard.jpg',
        }),
        expect.objectContaining({
          key: 'premium_cozy_outfit',
          isPremium: true,
        }),
      ]),
    );

    const rules = await dataSource.getRepository(PetDropRule).find({
      where: {
        sourceType: In([
          PetDropSourceType.DAILY_TASK,
          PetDropSourceType.EXTRA_TASK,
          PetDropSourceType.TEACHER_MISSION,
          PetDropSourceType.THERAPIST_MISSION,
          PetDropSourceType.PROACTIVE_REQUEST,
        ]),
      },
    });
    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: PetDropSourceType.DAILY_TASK,
          rarity: PetItemRarity.COMMON,
          chanceBasisPoints: 500,
        }),
        expect.objectContaining({
          sourceType: PetDropSourceType.THERAPIST_MISSION,
          rarity: PetItemRarity.RARE,
          chanceBasisPoints: 2000,
        }),
      ]),
    );

    const premiumFlag = await dataSource.getRepository(FeatureFlag).findOne({
      where: { key: 'pet_premium_cosmetics' },
    });
    expect(premiumFlag).toMatchObject({
      premiumGate: true,
      enabled: false,
    });
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

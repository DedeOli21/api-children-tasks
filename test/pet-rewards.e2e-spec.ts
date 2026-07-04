import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import {
  authHeader,
  createChild,
  createLinkedTeacher,
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
  FeatureFlag,
  FamilyFeatureFlag,
  User,
} from '../src/entities';
import { PetRewardsService } from '../src/pet-rewards/pet-rewards.service';

describe('Pet Rewards and Drops (e2e)', () => {
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

  async function seedDrop(
    sourceType: PetDropSourceType,
    rarity = PetItemRarity.COMMON,
  ) {
    seq += 1;
    const petItem = await dataSource.getRepository(PetItem).save(
      dataSource.getRepository(PetItem).create({
        key: `drop-test-${sourceType}-${seq}`,
        name: `Item Drop ${seq}`,
        type: PetItemType.HAT,
        attachmentSlot: PetAttachmentSlot.HEAD,
        attachmentKey: `hat_drop_${seq}`,
        previewEmoji: '🧢',
        rarity,
        active: true,
      }),
    );

    await dataSource.getRepository(PetDropRule).save(
      dataSource.getRepository(PetDropRule).create({
        sourceType,
        rarity,
        chanceBasisPoints: 10_000,
        active: true,
      }),
    );

    return petItem;
  }

  it('aprovação de tarefa comum sincroniza XP do pet e concede drop transacional', async () => {
    const expectedItem = await seedDrop(PetDropSourceType.DAILY_TASK);
    const parent = await registerParent(app);
    const { child, username, password } = await createChild(app, parent.token);
    const childAuth = await login(app, username, password);

    const task = await request(app.getHttpServer())
      .post('/api/tasks')
      .set(authHeader(parent.token))
      .send({ title: 'Guardar mochila', iconEmoji: '🎒' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/tasks/${task.body.id}/complete`)
      .set(authHeader(childAuth.token))
      .expect(200);

    const pending = await request(app.getHttpServer())
      .get('/api/tasks/pending-approval')
      .set(authHeader(parent.token))
      .expect(200);

    const approved = await request(app.getHttpServer())
      .patch(`/api/tasks/logs/${pending.body[0].logId}/approve`)
      .set(authHeader(parent.token))
      .expect(200);

    expect(approved.body.petReward.progress).toMatchObject({
      xp: 100,
      level: 2,
      animationState: 'happy',
    });
    expect(approved.body.petReward.drop).toMatchObject({
      dropped: true,
      chanceBasisPoints: 10000,
      item: {
        id: expectedItem.id,
        key: expectedItem.key,
        attachmentSlot: 'head',
      },
    });

    const inventory = await dataSource.getRepository(PetInventoryItem).findOne({
      where: { childId: child.id, petItemId: expectedItem.id },
    });
    expect(inventory).toMatchObject({
      acquisitionSource: 'drop',
      equipped: false,
      quantity: 1,
    });

    const drop = await dataSource.getRepository(PetDrop).findOne({
      where: {
        childId: child.id,
        petItemId: expectedItem.id,
        sourceType: PetDropSourceType.DAILY_TASK,
      },
    });
    expect(drop?.sourceId).toBe(pending.body[0].logId);
  });

  it('aprovação de missão do professor usa a tabela de drop de missões extras', async () => {
    const expectedItem = await seedDrop(
      PetDropSourceType.TEACHER_MISSION,
      PetItemRarity.RARE,
    );
    const parent = await registerParent(app);
    const { child, username, password } = await createChild(app, parent.token);
    const childAuth = await login(app, username, password);
    const teacher = await createLinkedTeacher(app, child);

    const mission = await request(app.getHttpServer())
      .post('/api/missions')
      .set(authHeader(teacher.token))
      .send({
        childIds: [child.id],
        title: 'Ler 10 páginas',
        starsReward: 2,
      })
      .expect(201);

    const today = new Date().toISOString().split('T')[0];
    await request(app.getHttpServer())
      .patch(`/api/missions/${mission.body[0].id}/allocate`)
      .set(authHeader(parent.token))
      .send({ date: today })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/missions/${mission.body[0].id}/complete`)
      .set(authHeader(childAuth.token))
      .expect(200);

    const approved = await request(app.getHttpServer())
      .patch(`/api/missions/${mission.body[0].id}/approve`)
      .set(authHeader(parent.token))
      .expect(200);

    expect(approved.body.petReward.drop).toMatchObject({
      dropped: true,
      chanceBasisPoints: 10000,
      item: {
        id: expectedItem.id,
        key: expectedItem.key,
      },
    });

    const drop = await dataSource.getRepository(PetDrop).findOne({
      where: {
        childId: child.id,
        petItemId: expectedItem.id,
        sourceType: PetDropSourceType.TEACHER_MISSION,
      },
    });
    expect(drop?.sourceId).toBe(mission.body[0].id);
  });

  it('bloqueia item premium sem feature flag da família', async () => {
    const parent = await registerParent(app);
    const { child } = await createChild(app, parent.token);
    const flagKey = `premium-pet-${seq + 1}`;

    const premiumItem = await dataSource.getRepository(PetItem).save(
      dataSource.getRepository(PetItem).create({
        key: `premium-drop-${seq + 1}`,
        name: 'Óculos Lendário',
        type: PetItemType.GLASSES,
        attachmentSlot: PetAttachmentSlot.EYES,
        attachmentKey: `glasses_legendary_${seq + 1}`,
        previewEmoji: '🕶️',
        rarity: PetItemRarity.LEGENDARY,
        isPremium: true,
        featureFlagKey: flagKey,
        active: true,
      }),
    );
    await dataSource.getRepository(PetDropRule).save(
      dataSource.getRepository(PetDropRule).create({
        sourceType: PetDropSourceType.PROACTIVE_REQUEST,
        rarity: PetItemRarity.LEGENDARY,
        chanceBasisPoints: 10_000,
        active: true,
      }),
    );

    const childUser = await dataSource
      .getRepository(User)
      .findOneByOrFail({ id: child.id });
    const rewards = app.get(PetRewardsService);

    const blocked = await dataSource.transaction((manager) =>
      rewards.awardForCompletion(manager, {
        familyId: parent.user.id,
        child: childUser,
        sourceType: PetDropSourceType.PROACTIVE_REQUEST,
        sourceId: 'super-iniciativa-bloqueada',
      }),
    );
    expect(blocked.drop.dropped).toBe(false);

    await dataSource.getRepository(FeatureFlag).save(
      dataSource.getRepository(FeatureFlag).create({
        key: flagKey,
        name: 'Cosméticos premium do pet',
        premiumGate: true,
        enabled: false,
      }),
    );
    await dataSource.getRepository(FamilyFeatureFlag).save(
      dataSource.getRepository(FamilyFeatureFlag).create({
        familyId: parent.user.id,
        flagKey,
        enabled: true,
      }),
    );

    const allowed = await dataSource.transaction((manager) =>
      rewards.awardForCompletion(manager, {
        familyId: parent.user.id,
        child: childUser,
        sourceType: PetDropSourceType.PROACTIVE_REQUEST,
        sourceId: 'super-iniciativa-premium',
      }),
    );
    expect(allowed.drop).toMatchObject({
      dropped: true,
      item: {
        id: premiumItem.id,
        key: premiumItem.key,
        isPremium: true,
      },
    });
  });
});

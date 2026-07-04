import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  FeatureFlag,
  PetAttachmentSlot,
  PetDropRule,
  PetDropSourceType,
  PetItem,
  PetItemRarity,
  PetItemType,
} from '../entities';

const PREMIUM_PET_FLAG_KEY = 'pet_premium_cosmetics';

type DefaultPetItem = {
  key: string;
  name: string;
  description: string;
  type: PetItemType;
  attachmentSlot: PetAttachmentSlot;
  attachmentKey: string;
  assetUrl: string;
  previewEmoji: string;
  rarity: PetItemRarity;
  isPremium?: boolean;
  featureFlagKey?: string | null;
  metadata?: Record<string, unknown>;
};

type DefaultDropRule = {
  sourceType: PetDropSourceType;
  rarity: PetItemRarity;
  chanceBasisPoints: number;
  minPetLevel?: number;
  maxPetLevel?: number | null;
  featureFlagKey?: string | null;
};

export const DEFAULT_PET_ITEM_KEYS = [
  'drop_water_magic',
  'drop_food_bone',
  'drop_freeze_potion',
  'species_cat_orange',
  'background_backyard',
  'premium_cozy_outfit',
] as const;

const DEFAULT_PET_ITEMS: DefaultPetItem[] = [
  {
    key: 'drop_water_magic',
    name: 'Agua Magica',
    description: 'Efeito visual de agua para celebrar tarefas completas.',
    type: PetItemType.EFFECT,
    attachmentSlot: PetAttachmentSlot.EFFECT,
    attachmentKey: 'water_magic',
    assetUrl: '/assets/water_drop.jpg',
    previewEmoji: '💧',
    rarity: PetItemRarity.COMMON,
  },
  {
    key: 'drop_food_bone',
    name: 'Osso Dourado',
    description: 'Efeito visual de recompensa encontrado em tarefas comuns.',
    type: PetItemType.EFFECT,
    attachmentSlot: PetAttachmentSlot.EFFECT,
    attachmentKey: 'food_bone',
    assetUrl: '/assets/food_bone.jpg',
    previewEmoji: '🦴',
    rarity: PetItemRarity.COMMON,
  },
  {
    key: 'drop_freeze_potion',
    name: 'Pocao de Protecao',
    description: 'Item raro visual para representar protecao de sequencia.',
    type: PetItemType.EFFECT,
    attachmentSlot: PetAttachmentSlot.EFFECT,
    attachmentKey: 'freeze_potion',
    assetUrl: '/assets/potion_freeze.jpg',
    previewEmoji: '🧊',
    rarity: PetItemRarity.RARE,
    metadata: { futureEffect: 'streak_freeze' },
  },
  {
    key: 'species_cat_orange',
    name: 'Gatinho Laranja',
    description: 'Mascote alternativo para a crianca equipar no palco.',
    type: PetItemType.SPECIES,
    attachmentSlot: PetAttachmentSlot.SPECIES,
    attachmentKey: 'cat_orange',
    assetUrl: '/assets/cat_idle_happy.jpg',
    previewEmoji: '🐱',
    rarity: PetItemRarity.RARE,
  },
  {
    key: 'background_backyard',
    name: 'Quintal Ensolarado',
    description: 'Cenario colorido para o palco do mascote.',
    type: PetItemType.BACKGROUND,
    attachmentSlot: PetAttachmentSlot.BACKGROUND,
    attachmentKey: 'backyard',
    assetUrl: '/assets/bg_backyard.jpg',
    previewEmoji: '🏡',
    rarity: PetItemRarity.RARE,
  },
  {
    key: 'premium_cozy_outfit',
    name: 'Roupa Premium Aconchegante',
    description: 'Cosmetico premium desbloqueado por plano ou feature flag.',
    type: PetItemType.OUTFIT,
    attachmentSlot: PetAttachmentSlot.BODY,
    attachmentKey: 'premium_cozy_outfit',
    assetUrl: '/assets/equipped_premium.jpg',
    previewEmoji: '🧥',
    rarity: PetItemRarity.EPIC,
    isPremium: true,
    featureFlagKey: PREMIUM_PET_FLAG_KEY,
  },
];

const DEFAULT_DROP_RULES: DefaultDropRule[] = [
  {
    sourceType: PetDropSourceType.DAILY_TASK,
    rarity: PetItemRarity.COMMON,
    chanceBasisPoints: 500,
  },
  {
    sourceType: PetDropSourceType.EXTRA_TASK,
    rarity: PetItemRarity.COMMON,
    chanceBasisPoints: 500,
  },
  {
    sourceType: PetDropSourceType.TEACHER_MISSION,
    rarity: PetItemRarity.RARE,
    chanceBasisPoints: 1500,
  },
  {
    sourceType: PetDropSourceType.THERAPIST_MISSION,
    rarity: PetItemRarity.RARE,
    chanceBasisPoints: 2000,
  },
  {
    sourceType: PetDropSourceType.PROACTIVE_REQUEST,
    rarity: PetItemRarity.RARE,
    chanceBasisPoints: 1500,
  },
  {
    sourceType: PetDropSourceType.THERAPIST_MISSION,
    rarity: PetItemRarity.EPIC,
    chanceBasisPoints: 250,
    featureFlagKey: PREMIUM_PET_FLAG_KEY,
    minPetLevel: 10,
  },
];

@Injectable()
export class PetCatalogSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PetCatalogSeedService.name);

  constructor(
    @InjectRepository(PetItem)
    private readonly petItemRepository: Repository<PetItem>,
    @InjectRepository(PetDropRule)
    private readonly dropRuleRepository: Repository<PetDropRule>,
    @InjectRepository(FeatureFlag)
    private readonly featureFlagRepository: Repository<FeatureFlag>,
  ) {}

  async onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test') return;
    await this.ensureCatalog();
  }

  async ensureCatalog() {
    await this.ensurePremiumFlag();

    let createdItems = 0;
    for (const item of DEFAULT_PET_ITEMS) {
      const created = await this.upsertPetItem(item);
      if (created) createdItems += 1;
    }

    let createdRules = 0;
    for (const rule of DEFAULT_DROP_RULES) {
      const created = await this.upsertDropRule(rule);
      if (created) createdRules += 1;
    }

    if (createdItems || createdRules) {
      this.logger.log(
        `Catalogo do pet atualizado: ${createdItems} item(ns), ${createdRules} regra(s) de drop`,
      );
    }

    return {
      itemKeys: DEFAULT_PET_ITEM_KEYS,
      rules: DEFAULT_DROP_RULES.length,
      createdItems,
      createdRules,
    };
  }

  private async ensurePremiumFlag() {
    let flag = await this.featureFlagRepository.findOne({
      where: { key: PREMIUM_PET_FLAG_KEY },
    });

    if (!flag) {
      flag = this.featureFlagRepository.create({
        key: PREMIUM_PET_FLAG_KEY,
        name: 'Cosmeticos premium do pet',
        description: 'Libera itens epicos e lendarios do mascote virtual.',
        premiumGate: true,
        enabled: false,
        rolloutPercent: 0,
      });
    } else {
      flag.name = 'Cosmeticos premium do pet';
      flag.description = 'Libera itens epicos e lendarios do mascote virtual.';
      flag.premiumGate = true;
    }

    await this.featureFlagRepository.save(flag);
  }

  private async upsertPetItem(item: DefaultPetItem) {
    let entity = await this.petItemRepository.findOne({
      where: { key: item.key },
    });
    const created = !entity;

    if (!entity) {
      entity = this.petItemRepository.create({ key: item.key });
    }

    Object.assign(entity, {
      name: item.name,
      description: item.description,
      type: item.type,
      attachmentSlot: item.attachmentSlot,
      attachmentKey: item.attachmentKey,
      assetUrl: item.assetUrl,
      previewEmoji: item.previewEmoji,
      rarity: item.rarity,
      isPremium: item.isPremium ?? false,
      featureFlagKey: item.featureFlagKey ?? null,
      minPetLevel: 1,
      active: true,
      metadata: item.metadata ?? null,
    });

    await this.petItemRepository.save(entity);
    return created;
  }

  private async upsertDropRule(rule: DefaultDropRule) {
    const where = {
      sourceType: rule.sourceType,
      rarity: rule.rarity,
      minPetLevel: rule.minPetLevel ?? 1,
      maxPetLevel:
        rule.maxPetLevel === undefined || rule.maxPetLevel === null
          ? IsNull()
          : rule.maxPetLevel,
      featureFlagKey: rule.featureFlagKey ? rule.featureFlagKey : IsNull(),
    };

    let entity = await this.dropRuleRepository.findOne({ where });
    const created = !entity;

    if (!entity) {
      entity = this.dropRuleRepository.create({
        sourceType: rule.sourceType,
        rarity: rule.rarity,
        minPetLevel: rule.minPetLevel ?? 1,
        maxPetLevel: rule.maxPetLevel ?? null,
        featureFlagKey: rule.featureFlagKey ?? null,
      });
    }

    entity.chanceBasisPoints = rule.chanceBasisPoints;
    entity.active = true;
    await this.dropRuleRepository.save(entity);
    return created;
  }
}

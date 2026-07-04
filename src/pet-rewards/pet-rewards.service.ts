import { Injectable } from '@nestjs/common';
import { EntityManager, IsNull, LessThanOrEqual, MoreThan } from 'typeorm';
import {
  FamilyFeatureFlag,
  FeatureFlag,
  PetAnimationState,
  PetDrop,
  PetDropRule,
  PetDropSourceType,
  PetInventoryItem,
  PetItem,
  PetItemAcquisitionSource,
  PetItemRarity,
  User,
  VirtualPet,
} from '../entities';

const MAX_LEVEL = 100;
const XP_PER_STREAK_DAY = 100;
const DEFAULT_DROP_CHANCE: Record<PetDropSourceType, number> = {
  [PetDropSourceType.DAILY_TASK]: 500,
  [PetDropSourceType.EXTRA_TASK]: 500,
  [PetDropSourceType.TEACHER_MISSION]: 1500,
  [PetDropSourceType.THERAPIST_MISSION]: 2000,
  [PetDropSourceType.PROACTIVE_REQUEST]: 1500,
};

type DropRuleCandidate = {
  rarity: PetItemRarity;
  chanceBasisPoints: number;
  featureFlagKey: string | null;
};

export interface PetRewardResult {
  progress: {
    xp: number;
    level: number;
    xpToNextLevel: number;
    animationState: PetAnimationState;
  };
  drop: {
    dropped: boolean;
    chanceBasisPoints: number;
    rollBasisPoints: number;
    item?: {
      id: string;
      key: string;
      name: string;
      rarity: PetItemRarity;
      attachmentSlot: string;
      attachmentKey: string;
      previewEmoji: string;
      isPremium: boolean;
    };
  };
}

@Injectable()
export class PetRewardsService {
  progressForStreak(streak: number) {
    const safeStreak = Math.max(0, streak);
    const xp = safeStreak * XP_PER_STREAK_DAY;
    const level = Math.min(MAX_LEVEL, safeStreak + 1);
    return {
      xp,
      level,
      xpToNextLevel: level >= MAX_LEVEL ? 0 : XP_PER_STREAK_DAY,
    };
  }

  async syncProgressWithStreak(
    manager: EntityManager,
    child: User,
    forcedState?: PetAnimationState,
  ) {
    const pet = await this.getOrCreatePet(manager, child.id);
    const progress = this.progressForStreak(child.currentStreak);
    pet.xp = progress.xp;
    pet.level = progress.level;
    pet.xpToNextLevel = progress.xpToNextLevel;
    pet.animationState =
      forcedState ??
      (pet.sickSince
        ? PetAnimationState.SAD
        : child.currentStreak > 0
          ? PetAnimationState.HAPPY
          : PetAnimationState.IDLE);
    await manager.save(pet);

    return {
      ...progress,
      animationState: pet.animationState,
    };
  }

  async awardForCompletion(
    manager: EntityManager,
    input: {
      familyId: string;
      child: User;
      sourceType: PetDropSourceType;
      sourceId?: string | null;
    },
  ): Promise<PetRewardResult> {
    const progress = await this.syncProgressWithStreak(manager, input.child);
    const rules = await this.getEligibleRules(
      manager,
      input.familyId,
      input.sourceType,
      progress.level,
    );
    const selectedRule =
      rules[0] ?? this.defaultRuleFor(input.sourceType);
    const rollBasisPoints = this.rollBasisPoints();

    const dropBase = {
      dropped: false,
      chanceBasisPoints: selectedRule.chanceBasisPoints,
      rollBasisPoints,
    };

    if (rollBasisPoints > selectedRule.chanceBasisPoints) {
      return { progress, drop: dropBase };
    }

    const petItem = await this.pickDropItem(
      manager,
      input.familyId,
      input.child.id,
      selectedRule.rarity,
      progress.level,
    );
    if (!petItem) {
      return { progress, drop: dropBase };
    }

    const inventory = manager.create(PetInventoryItem, {
      childId: input.child.id,
      petItemId: petItem.id,
      quantity: 1,
      equipped: false,
      equippedSlot: null,
      acquisitionSource: PetItemAcquisitionSource.DROP,
      acquiredAt: new Date(),
    });
    await manager.save(inventory);

    await manager.save(
      manager.create(PetDrop, {
        familyId: input.familyId,
        childId: input.child.id,
        petItemId: petItem.id,
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        chanceBasisPoints: selectedRule.chanceBasisPoints,
        rollBasisPoints,
      }),
    );

    return {
      progress,
      drop: {
        ...dropBase,
        dropped: true,
        item: {
          id: petItem.id,
          key: petItem.key,
          name: petItem.name,
          rarity: petItem.rarity,
          attachmentSlot: petItem.attachmentSlot,
          attachmentKey: petItem.attachmentKey,
          previewEmoji: petItem.previewEmoji,
          isPremium: petItem.isPremium,
        },
      },
    };
  }

  private async getOrCreatePet(manager: EntityManager, childId: string) {
    let pet = await manager.findOne(VirtualPet, { where: { childId } });
    if (!pet) {
      pet = manager.create(VirtualPet, {
        childId,
        lastDecayAt: new Date(),
      });
      await manager.save(pet);
    }
    return pet;
  }

  private async getEligibleRules(
    manager: EntityManager,
    familyId: string,
    sourceType: PetDropSourceType,
    petLevel: number,
  ): Promise<DropRuleCandidate[]> {
    const rules = await manager.find(PetDropRule, {
      where: [
        {
          sourceType,
          active: true,
          minPetLevel: LessThanOrEqual(petLevel),
          maxPetLevel: IsNull(),
        },
        {
          sourceType,
          active: true,
          minPetLevel: LessThanOrEqual(petLevel),
          maxPetLevel: MoreThan(petLevel - 1),
        },
      ],
      order: { chanceBasisPoints: 'DESC' },
    });

    const enabledRules: DropRuleCandidate[] = [];
    for (const rule of rules) {
      if (await this.isFeatureEnabled(manager, familyId, rule.featureFlagKey)) {
        enabledRules.push({
          rarity: rule.rarity,
          chanceBasisPoints: rule.chanceBasisPoints,
          featureFlagKey: rule.featureFlagKey,
        });
      }
    }
    return enabledRules;
  }

  private defaultRuleFor(sourceType: PetDropSourceType): DropRuleCandidate {
    return {
      rarity: PetItemRarity.COMMON,
      chanceBasisPoints: DEFAULT_DROP_CHANCE[sourceType],
      featureFlagKey: null,
    };
  }

  private async pickDropItem(
    manager: EntityManager,
    familyId: string,
    childId: string,
    rarity: PetItemRarity,
    petLevel: number,
  ) {
    const items = await manager.find(PetItem, {
      where: {
        rarity,
        active: true,
        minPetLevel: LessThanOrEqual(petLevel),
      },
      order: { createdAt: 'ASC' },
    });
    if (items.length === 0) return null;

    const owned = await manager.find(PetInventoryItem, {
      where: { childId },
      select: ['petItemId'],
    });
    const ownedIds = new Set(owned.map((item) => item.petItemId));
    const eligible: PetItem[] = [];
    for (const item of items) {
      if (ownedIds.has(item.id)) continue;
      if (item.isPremium && !item.featureFlagKey) continue;
      if (item.isPremium || item.featureFlagKey) {
        const enabled = await this.isFeatureEnabled(
          manager,
          familyId,
          item.featureFlagKey,
        );
        if (!enabled) continue;
      }
      eligible.push(item);
    }

    if (eligible.length === 0) return null;
    return eligible[Math.floor(Math.random() * eligible.length)];
  }

  private async isFeatureEnabled(
    manager: EntityManager,
    familyId: string,
    flagKey?: string | null,
  ) {
    if (!flagKey) return true;

    const flag = await manager.findOne(FeatureFlag, {
      where: { key: flagKey },
    });
    if (!flag) return false;

    const override = await manager.findOne(FamilyFeatureFlag, {
      where: { familyId, flagKey },
    });
    if (override) {
      const expired =
        override.expiresAt && override.expiresAt.getTime() < Date.now();
      return override.enabled && !expired;
    }

    if (flag.premiumGate) return false;
    if (flag.enabled) return true;
    if (flag.rolloutPercent <= 0) return false;
    return this.percentBucket(familyId, flagKey) < flag.rolloutPercent;
  }

  private percentBucket(familyId: string, flagKey: string) {
    const raw = `${familyId}:${flagKey}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i += 1) {
      hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
    }
    return hash % 100;
  }

  private rollBasisPoints() {
    return Math.floor(Math.random() * 10_000) + 1;
  }
}

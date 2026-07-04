import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import {
  VirtualPet,
  PetEquippedItems,
  PetAttachmentSlot,
  ShopItem,
  ShopItemType,
  InventoryItem,
  PetInventoryItem,
  User,
  HistoryEntry,
  HistoryType,
} from '../entities';
import { NotificationType } from '../entities';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateShopItemDto, UpdateShopItemDto } from './dto/create-shop-item.dto';

// Queda de nível por hora sem cuidado (~1 dia e meio até zerar de 100)
const DECAY_PER_HOUR = 3;
// XP ganho por ato de cuidado
const XP_PER_CARE = 5;
const DEFAULT_PET_NAME = 'Lulu';
const DEFAULT_PET_MODEL = 'dog';

export type PetStage = 'seed' | 'sprout' | 'growing' | 'blooming';
export type PetMood = 'happy' | 'thirsty' | 'hungry' | 'sad';

@Injectable()
export class PetService {
  constructor(
    @InjectRepository(VirtualPet)
    private petRepository: Repository<VirtualPet>,
    @InjectRepository(ShopItem)
    private shopItemRepository: Repository<ShopItem>,
    @InjectRepository(InventoryItem)
    private inventoryRepository: Repository<InventoryItem>,
    @InjectRepository(PetInventoryItem)
    private petInventoryRepository: Repository<PetInventoryItem>,
    private dataSource: DataSource,
    private notificationsService: NotificationsService,
  ) {}

  // ============ ESTADO DERIVADO ============

  private stageOf(xp: number): PetStage {
    if (xp >= 150) return 'blooming';
    if (xp >= 60) return 'growing';
    if (xp >= 20) return 'sprout';
    return 'seed';
  }

  private moodOf(pet: VirtualPet): PetMood {
    if (pet.waterLevel === 0 || pet.nutritionLevel === 0) return 'sad';
    if (pet.waterLevel < 30) return 'thirsty';
    if (pet.nutritionLevel < 30) return 'hungry';
    return 'happy';
  }

  // Decaimento preguiçoso: aplica a queda proporcional ao tempo decorrido
  private applyDecay(pet: VirtualPet): boolean {
    const now = new Date();
    if (!pet.lastDecayAt) {
      pet.lastDecayAt = now;
      return true;
    }
    const hours = Math.floor(
      (now.getTime() - new Date(pet.lastDecayAt).getTime()) / 3_600_000,
    );
    if (hours <= 0) return false;

    const decay = hours * DECAY_PER_HOUR;
    pet.waterLevel = Math.max(0, pet.waterLevel - decay);
    pet.nutritionLevel = Math.max(0, pet.nutritionLevel - decay);
    pet.lastDecayAt = now;
    return true;
  }

  private async toPublic(pet: VirtualPet, child: User) {
    const equipped = await this.inventoryRepository.find({
      where: { childId: pet.childId, equipped: true },
    });
    const byType = new Map(
      equipped.map((item) => [item.shopItem?.type, item.shopItem]),
    );
    const equippedPetItems = await this.petInventoryRepository.find({
      where: { childId: pet.childId, equipped: true },
      order: { updatedAt: 'DESC' },
    });
    const equippedAttachments = this.petAttachmentSnapshot(equippedPetItems);

    return {
      id: pet.id,
      childId: pet.childId,
      name: pet.name,
      modelKey: pet.modelKey,
      riveArtboard: pet.riveArtboard,
      riveStateMachine: pet.riveStateMachine,
      animationState: pet.animationState,
      waterLevel: pet.waterLevel,
      nutritionLevel: pet.nutritionLevel,
      xp: pet.xp,
      level: pet.level,
      xpToNextLevel: pet.xpToNextLevel,
      stage: this.stageOf(pet.xp),
      mood: this.moodOf(pet),
      equippedItems:
        pet.equippedItems && Object.keys(pet.equippedItems).length > 0
          ? pet.equippedItems
          : equippedAttachments,
      equippedAttachments: equippedPetItems.map((entry) =>
        this.petInventorySummary(entry),
      ),
      // Doente: penalidade da meia-noite; cura ao fechar um dia completo
      sick: !!pet.sickSince,
      sickSince: pet.sickSince,
      // Pet triste visualmente quando o streak quebrou há pouco
      wilted:
        child.currentStreak === 0 &&
        !!child.streakBrokenAt &&
        this.daysSince(child.streakBrokenAt) <= 2,
      skin: this.itemSummary(byType.get(ShopItemType.SKIN)),
      background: this.itemSummary(byType.get(ShopItemType.BACKGROUND)),
      effect: this.itemSummary(byType.get(ShopItemType.EFFECT)),
    };
  }

  private itemSummary(item?: ShopItem | null) {
    if (!item) return null;
    return { id: item.id, name: item.name, emoji: item.emoji };
  }

  private petInventorySummary(entry: PetInventoryItem) {
    const item = entry.petItem;
    return {
      inventoryItemId: entry.id,
      petItemId: entry.petItemId,
      name: item.name,
      emoji: item.previewEmoji,
      type: item.type,
      rarity: item.rarity,
      isPremium: item.isPremium,
      attachmentSlot: item.attachmentSlot,
      attachmentKey: item.attachmentKey,
      assetUrl: item.assetUrl,
      quantity: entry.quantity,
      equipped: entry.equipped,
      equippedSlot: entry.equippedSlot,
      acquisitionSource: entry.acquisitionSource,
      acquiredAt: entry.acquiredAt,
    };
  }

  private petAttachmentSnapshot(entries: PetInventoryItem[]): PetEquippedItems {
    const equippedItems: PetEquippedItems = {};
    for (const entry of entries) {
      if (!entry.equipped || !entry.petItem) continue;
      equippedItems[entry.petItem.attachmentSlot] = entry.petItem.attachmentKey;
    }
    return equippedItems;
  }

  private daysSince(date: string): number {
    const then = new Date(`${date}T12:00:00Z`).getTime();
    return Math.floor((Date.now() - then) / 86_400_000);
  }

  // ============ PET ============

  // Criação preguiçosa: toda criança ganha o pet no primeiro acesso
  private async getOrCreate(childId: string): Promise<VirtualPet> {
    let pet = await this.petRepository.findOne({ where: { childId } });
    if (!pet) {
      pet = await this.petRepository.save(
        this.petRepository.create({
          childId,
          name: DEFAULT_PET_NAME,
          modelKey: DEFAULT_PET_MODEL,
          lastDecayAt: new Date(),
        }),
      );
    }
    if (this.normalizeLegacyPet(pet)) {
      pet = await this.petRepository.save(pet);
    }
    return pet;
  }

  private normalizeLegacyPet(pet: VirtualPet): boolean {
    let changed = false;
    if (!pet.modelKey || pet.modelKey === 'plant_v1') {
      pet.modelKey = DEFAULT_PET_MODEL;
      changed = true;
    }
    if (!pet.name || pet.name === 'Plantinha') {
      pet.name = DEFAULT_PET_NAME;
      changed = true;
    }
    return changed;
  }

  async getPet(child: User) {
    const pet = await this.getOrCreate(child.id);
    if (this.applyDecay(pet)) {
      await this.petRepository.save(pet);
    }

    // Notificação inteligente: sede/fome avisada no máximo 1x por dia
    const mood = this.moodOf(pet);
    if (mood === 'thirsty' || mood === 'hungry' || mood === 'sad') {
      const today = new Date().toISOString().split('T')[0];
      await this.notificationsService.notify(
        child.id,
        NotificationType.PET_THIRSTY,
        mood === 'thirsty' ? '💧 Seu pet está com sede!' : '🌰 Seu pet está com fome!',
        `${pet.name} precisa de você. Visite a Loja do Pet!`,
        `pet_needs:${child.id}:${today}`,
      );
    }

    return this.toPublic(pet, child);
  }

  async rename(child: User, name: string) {
    const pet = await this.getOrCreate(child.id);
    pet.name = name;
    await this.petRepository.save(pet);
    return { id: pet.id, name: pet.name, message: `Seu pet agora se chama ${name}!` };
  }

  async chooseSpecies(child: User, species: 'dog' | 'cat') {
    return this.dataSource.transaction(async (manager) => {
      let pet = await manager.findOne(VirtualPet, {
        where: { childId: child.id },
      });
      if (!pet) {
        pet = manager.create(VirtualPet, {
          childId: child.id,
          name: DEFAULT_PET_NAME,
          lastDecayAt: new Date(),
        });
      }

      const speciesKey = species === 'cat' ? 'cat_orange' : 'dog';
      const equippedItems: PetEquippedItems = { ...(pet.equippedItems ?? {}) };
      equippedItems.species = speciesKey;
      pet.modelKey = speciesKey;
      pet.equippedItems = equippedItems;
      await manager.save(pet);

      const equippedSpeciesItems = await manager.find(PetInventoryItem, {
        where: {
          childId: child.id,
          equipped: true,
          equippedSlot: PetAttachmentSlot.SPECIES,
        },
      });
      for (const item of equippedSpeciesItems) {
        item.equipped = false;
        item.equippedSlot = null;
        await manager.save(item);
      }

      return {
        ...(await this.toPublic(pet, child)),
        message:
          species === 'cat'
            ? 'Gatinho escolhido como seu pet!'
            : 'Cachorro escolhido como seu pet!',
      };
    });
  }

  // ============ LOJA ============

  // Catálogo visível: itens padrão (familyId null) + itens da família
  async catalog(familyId: string) {
    const [global, custom] = await Promise.all([
      this.shopItemRepository.find({
        where: { familyId: IsNull(), active: true },
        order: { type: 'ASC', price: 'ASC' },
      }),
      this.shopItemRepository.find({
        where: { familyId, active: true },
        order: { type: 'ASC', price: 'ASC' },
      }),
    ]);
    return [...global, ...custom].filter((item) => item.type !== ShopItemType.SKIN);
  }

  /**
   * Compra transacional: débito das estrelas, item no inventário
   * (empilhando consumíveis) e histórico — tudo junto ou nada.
   */
  async buy(child: User, familyId: string, shopItemId: string) {
    return this.dataSource.transaction(async (manager) => {
      const item = await manager.findOne(ShopItem, { where: { id: shopItemId } });
      if (!item || !item.active || (item.familyId !== null && item.familyId !== familyId)) {
        throw new NotFoundException('Item não encontrado na loja');
      }

      const freshChild = await manager.findOne(User, { where: { id: child.id } });
      if (!freshChild) {
        throw new NotFoundException('Criança não encontrada');
      }
      if (freshChild.currentStars < item.price) {
        throw new BadRequestException(
          `Estrelas insuficientes: você tem ${freshChild.currentStars}, o item custa ${item.price}`,
        );
      }

      const isConsumable =
        item.type === ShopItemType.WATER || item.type === ShopItemType.FOOD;

      let inventory = await manager.findOne(InventoryItem, {
        where: { childId: freshChild.id, shopItemId: item.id },
      });
      if (inventory && !isConsumable) {
        throw new BadRequestException('Você já tem este item!');
      }

      freshChild.currentStars -= item.price;
      await manager.save(freshChild);

      if (inventory) {
        inventory.quantity += 1;
      } else {
        inventory = manager.create(InventoryItem, {
          childId: freshChild.id,
          shopItemId: item.id,
          quantity: 1,
        });
      }
      await manager.save(inventory);

      await manager.save(
        manager.create(HistoryEntry, {
          userId: freshChild.id,
          type: HistoryType.REWARD_REDEEM,
          description: `Comprou na Loja do Pet: ${item.name} ${item.emoji}`,
          starsChange: -item.price,
        }),
      );

      return {
        item: { id: item.id, name: item.name, emoji: item.emoji, type: item.type },
        quantity: inventory.quantity,
        currentStars: freshChild.currentStars,
        message: `${item.emoji} ${item.name} comprado!`,
      };
    });
  }

  async inventory(childId: string) {
    const [items, petItems] = await Promise.all([
      this.inventoryRepository.find({
        where: { childId },
        order: { createdAt: 'ASC' },
      }),
      this.petInventoryRepository.find({
        where: { childId },
        order: { acquiredAt: 'DESC', createdAt: 'DESC' },
      }),
    ]);
    const shopItems = items
      .filter((entry) => entry.shopItem)
      .map((entry) => ({
        kind: 'shop_item',
        shopItemId: entry.shopItemId,
        name: entry.shopItem.name,
        emoji: entry.shopItem.emoji,
        type: entry.shopItem.type,
        restoreAmount: entry.shopItem.restoreAmount,
        quantity: entry.quantity,
        equipped: entry.equipped,
      }));
    const modernItems = petItems.map((entry) => ({
      kind: 'pet_item',
      ...this.petInventorySummary(entry),
    }));

    return [...shopItems, ...modernItems];
  }

  // ============ CUIDADO (hidratar/alimentar) ============

  async care(child: User, shopItemId: string) {
    const result = await this.dataSource.transaction(async (manager) => {
      const inventory = await manager.findOne(InventoryItem, {
        where: { childId: child.id, shopItemId },
      });
      if (!inventory || !inventory.shopItem || inventory.quantity < 1) {
        throw new BadRequestException('Você não tem este item — compre na Loja do Pet');
      }
      const item = inventory.shopItem;
      const isWater = item.type === ShopItemType.WATER;
      const isFood = item.type === ShopItemType.FOOD;
      if (!isWater && !isFood) {
        throw new BadRequestException('Apenas água e comida podem ser usadas no pet');
      }

      const pet = await manager.findOne(VirtualPet, {
        where: { childId: child.id },
      });
      if (!pet) {
        throw new NotFoundException('Pet ainda não existe — abra a tela do pet primeiro');
      }

      this.applyDecay(pet);

      if (isWater && pet.waterLevel >= 100) {
        throw new BadRequestException('Seu pet não está com sede agora!');
      }
      if (isFood && pet.nutritionLevel >= 100) {
        throw new BadRequestException('Seu pet está satisfeito!');
      }

      if (isWater) {
        pet.waterLevel = Math.min(100, pet.waterLevel + item.restoreAmount);
      } else {
        pet.nutritionLevel = Math.min(100, pet.nutritionLevel + item.restoreAmount);
      }
      pet.xp += XP_PER_CARE;
      await manager.save(pet);

      inventory.quantity -= 1;
      if (inventory.quantity === 0) {
        await manager.remove(inventory);
      } else {
        await manager.save(inventory);
      }

      return { pet, item, remaining: inventory.quantity };
    });

    return {
      waterLevel: result.pet.waterLevel,
      nutritionLevel: result.pet.nutritionLevel,
      xp: result.pet.xp,
      stage: this.stageOf(result.pet.xp),
      mood: this.moodOf(result.pet),
      itemUsed: { name: result.item.name, emoji: result.item.emoji },
      remaining: result.remaining,
      message:
        result.item.type === ShopItemType.WATER
          ? `${result.item.emoji} Glub glub! Seu pet agradece 💚`
          : `${result.item.emoji} Nham! Seu pet ficou mais animado 💚`,
    };
  }

  // ============ COSMÉTICOS ============

  async equip(child: User, shopItemId: string) {
    const petItemResult = await this.equipPetInventoryItem(child, shopItemId);
    if (petItemResult) return petItemResult;

    return this.dataSource.transaction(async (manager) => {
      const inventory = await manager.findOne(InventoryItem, {
        where: { childId: child.id, shopItemId },
      });
      if (!inventory || !inventory.shopItem) {
        throw new BadRequestException('Você não tem este item');
      }
      const type = inventory.shopItem.type;
      if (type === ShopItemType.WATER || type === ShopItemType.FOOD) {
        throw new BadRequestException('Consumíveis não são equipáveis — use-os no pet');
      }

      // No máximo um cosmético equipado por tipo
      const sameType = await manager.find(InventoryItem, {
        where: { childId: child.id, equipped: true },
      });
      for (const other of sameType) {
        if (other.shopItem?.type === type && other.id !== inventory.id) {
          other.equipped = false;
          await manager.save(other);
        }
      }

      inventory.equipped = !inventory.equipped;
      await manager.save(inventory);

      return {
        shopItemId: inventory.shopItemId,
        equipped: inventory.equipped,
        message: inventory.equipped
          ? `${inventory.shopItem.emoji} ${inventory.shopItem.name} equipado!`
          : `${inventory.shopItem.emoji} ${inventory.shopItem.name} guardado`,
      };
    });
  }

  private async equipPetInventoryItem(child: User, itemId: string) {
    return this.dataSource.transaction(async (manager) => {
      const inventory = await manager.findOne(PetInventoryItem, {
        where: [
          { childId: child.id, id: itemId },
          { childId: child.id, petItemId: itemId },
        ],
      });
      if (!inventory || !inventory.petItem) return null;

      const slot = inventory.petItem.attachmentSlot;
      const shouldEquip = !inventory.equipped;
      const equippedInSlot = await manager.find(PetInventoryItem, {
        where: {
          childId: child.id,
          equipped: true,
          equippedSlot: slot,
        },
      });

      for (const other of equippedInSlot) {
        if (other.id === inventory.id) continue;
        other.equipped = false;
        other.equippedSlot = null;
        await manager.save(other);
      }

      inventory.equipped = shouldEquip;
      inventory.equippedSlot = shouldEquip ? slot : null;
      await manager.save(inventory);

      let pet = await manager.findOne(VirtualPet, {
        where: { childId: child.id },
      });
      if (!pet) {
        pet = manager.create(VirtualPet, {
          childId: child.id,
          lastDecayAt: new Date(),
        });
      }

      const equippedItems: PetEquippedItems = { ...(pet.equippedItems ?? {}) };
      equippedItems[slot] = shouldEquip ? inventory.petItem.attachmentKey : null;
      pet.equippedItems = equippedItems;
      await manager.save(pet);

      return {
        ...this.petInventorySummary(inventory),
        equippedItems,
        message: shouldEquip
          ? `${inventory.petItem.previewEmoji} ${inventory.petItem.name} equipado!`
          : `${inventory.petItem.previewEmoji} ${inventory.petItem.name} guardado`,
      };
    });
  }

  // ============ LOJA DO PET (gestão pelo responsável) ============

  async createShopItem(familyId: string, dto: CreateShopItemDto) {
    if (dto.type === ShopItemType.SKIN) {
      throw new BadRequestException(
        'A escolha do mascote agora é feita entre cachorro e gatinho na tela do pet',
      );
    }

    const isConsumable =
      dto.type === ShopItemType.WATER || dto.type === ShopItemType.FOOD;
    if (isConsumable && !dto.restoreAmount) {
      throw new BadRequestException('Consumíveis precisam de restoreAmount (1–100)');
    }
    return this.shopItemRepository.save(
      this.shopItemRepository.create({
        familyId,
        type: dto.type,
        name: dto.name,
        emoji: dto.emoji ?? '🐾',
        description: dto.description ?? null,
        price: dto.price,
        restoreAmount: isConsumable ? (dto.restoreAmount ?? 0) : 0,
      }),
    );
  }

  async updateShopItem(familyId: string, id: string, dto: UpdateShopItemDto) {
    // Apenas itens da própria família — o catálogo padrão é imutável
    const item = await this.shopItemRepository.findOne({
      where: { id, familyId },
    });
    if (!item) {
      throw new NotFoundException('Item não encontrado entre os itens da família');
    }
    Object.assign(item, dto);
    return this.shopItemRepository.save(item);
  }

  async removeShopItem(familyId: string, id: string) {
    const item = await this.shopItemRepository.findOne({
      where: { id, familyId },
    });
    if (!item) {
      throw new NotFoundException('Item não encontrado entre os itens da família');
    }
    // Desativa em vez de remover: inventários existentes continuam válidos
    item.active = false;
    await this.shopItemRepository.save(item);
    return { message: `Item "${item.name}" removido da loja` };
  }
}

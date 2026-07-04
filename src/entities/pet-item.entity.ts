import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PetItemType {
  OUTFIT = 'outfit',
  GLASSES = 'glasses',
  HAT = 'hat',
  BACKGROUND = 'background',
  EFFECT = 'effect',
  SPECIES = 'species',
}

export enum PetAttachmentSlot {
  BODY = 'body',
  HEAD = 'head',
  EYES = 'eyes',
  BACKGROUND = 'background',
  EFFECT = 'effect',
  SPECIES = 'species',
}

export enum PetItemRarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

/**
 * Catálogo game-like dos cosméticos do Pet.
 * attachmentKey é o identificador usado pelo frontend para injetar o asset
 * no slot da animação Rive/Pixi.
 */
@Entity('pet_items')
@Index(['type', 'rarity'])
@Index(['attachmentSlot', 'active'])
export class PetItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text' })
  type: PetItemType;

  @Column({ name: 'attachment_slot', type: 'text' })
  attachmentSlot: PetAttachmentSlot;

  @Column({ name: 'attachment_key' })
  attachmentKey: string;

  @Column({ name: 'asset_url', type: 'text', nullable: true })
  assetUrl: string | null;

  @Column({ name: 'preview_emoji', default: '✨' })
  previewEmoji: string;

  @Column({ type: 'text', default: PetItemRarity.COMMON })
  rarity: PetItemRarity;

  // Itens épicos/lendários podem existir no catálogo, mas ficam bloqueados
  // quando a família/plano não tiver a flag premium correspondente.
  @Column({ name: 'is_premium', default: false })
  isPremium: boolean;

  @Column({ name: 'feature_flag_key', type: 'text', nullable: true })
  featureFlagKey: string | null;

  @Column({ name: 'min_pet_level', type: 'int', default: 1 })
  minPetLevel: number;

  @Column({ default: true })
  active: boolean;

  @Column({
    type: process.env.DATABASE_TYPE === 'postgres' ? 'jsonb' : 'simple-json',
    nullable: true,
  })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MysteryPrizeRarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

@Entity('mystery_prizes')
export class MysteryPrize {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Família dona do prêmio (id do responsável)
  @Column({ name: 'family_id', type: 'text', nullable: true })
  familyId: string | null;

  @Column()
  name: string;

  @Column()
  emoji: string;

  @Column({
    type: 'text',
    enum: MysteryPrizeRarity,
    default: MysteryPrizeRarity.COMMON,
  })
  rarity: MysteryPrizeRarity;

  @Column()
  description: string;

  @Column({ type: 'integer', default: 1 })
  weight: number; // Peso para seleção aleatória (maior = mais fácil de ganhar)

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}


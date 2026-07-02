import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Tipo de recompensa na loja:
 *  privilege     → recompensa clássica (privilégio combinado com a família)
 *  streak_freeze → item consumível ("Regador Mágico"): o resgate credita
 *                  +1 no inventário de congelamentos, protegendo a Planta
 *                  da Consistência num dia ruim
 */
export enum RewardKind {
  PRIVILEGE = 'privilege',
  STREAK_FREEZE = 'streak_freeze',
}

@Entity('rewards')
export class Reward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Família dona da recompensa (id do responsável)
  @Column({ name: 'family_id', type: 'text', nullable: true })
  familyId: string | null;

  @Column({
    type: 'text',
    default: RewardKind.PRIVILEGE,
  })
  kind: RewardKind;

  @Column()
  title: string;

  @Column()
  emoji: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ default: 10 })
  cost: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

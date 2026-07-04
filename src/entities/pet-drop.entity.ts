import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { PetItem, PetItemRarity } from './pet-item.entity';

export enum PetDropSourceType {
  DAILY_TASK = 'daily_task',
  EXTRA_TASK = 'extra_task',
  TEACHER_MISSION = 'teacher_mission',
  THERAPIST_MISSION = 'therapist_mission',
  PROACTIVE_REQUEST = 'proactive_request',
}

@Entity('pet_drop_rules')
@Index(['sourceType', 'active'])
@Index(['sourceType', 'rarity'])
export class PetDropRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'source_type', type: 'text' })
  sourceType: PetDropSourceType;

  @Column({ type: 'text', default: PetItemRarity.COMMON })
  rarity: PetItemRarity;

  // 500 = 5%, 1500 = 15%, 2000 = 20%.
  @Column({ name: 'chance_basis_points', type: 'int' })
  chanceBasisPoints: number;

  @Column({ name: 'min_pet_level', type: 'int', default: 1 })
  minPetLevel: number;

  @Column({ name: 'max_pet_level', type: 'int', nullable: true })
  maxPetLevel: number | null;

  @Column({ name: 'feature_flag_key', type: 'text', nullable: true })
  featureFlagKey: string | null;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/**
 * Evento auditável de drop concedido.
 * Deve ser criado na mesma transação que conclui/aprova uma tarefa ou missão.
 */
@Entity('pet_drops')
@Index(['childId', 'createdAt'])
@Index(['sourceType', 'sourceId'])
export class PetDrop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'family_id' })
  familyId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'family_id' })
  family: User;

  @Column({ name: 'child_id' })
  childId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_id' })
  child: User;

  @Column({ name: 'pet_item_id' })
  petItemId: string;

  @ManyToOne(() => PetItem, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'pet_item_id' })
  petItem: PetItem;

  @Column({ name: 'source_type', type: 'text' })
  sourceType: PetDropSourceType;

  @Column({ name: 'source_id', type: 'text', nullable: true })
  sourceId: string | null;

  @Column({ name: 'chance_basis_points', type: 'int' })
  chanceBasisPoints: number;

  @Column({ name: 'roll_basis_points', type: 'int' })
  rollBasisPoints: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum PetAnimationState {
  IDLE = 'idle',
  HAPPY = 'happy',
  SAD = 'sad',
  SICK = 'sick',
  SLEEPING = 'sleeping',
}

export type PetEquippedItems = {
  body?: string | null;
  head?: string | null;
  eyes?: string | null;
  background?: string | null;
  effect?: string | null;
  species?: string | null;
};

/**
 * Mascote virtual da criança.
 *
 * equippedItems é um snapshot denormalizado para leitura rápida do frontend:
 * { head: "hat_red", eyes: "glasses_round", background: "garden_day" }.
 * A posse canônica dos itens mora em PetInventoryItem.
 */
@Entity('virtual_pets')
export class VirtualPet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Um pet por criança
  @Column({ name: 'child_id', unique: true })
  childId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_id' })
  child: User;

  // A criança batiza o próprio pet
  @Column({ default: 'Lulu' })
  name: string;

  // Modelo/artboard que o frontend deve carregar (ex.: lulu_pomeranian_v1)
  @Column({ name: 'model_key', default: 'dog' })
  modelKey: string;

  @Column({ name: 'rive_artboard', type: 'text', nullable: true })
  riveArtboard: string | null;

  @Column({ name: 'rive_state_machine', type: 'text', nullable: true })
  riveStateMachine: string | null;

  @Column({
    name: 'animation_state',
    type: 'text',
    default: PetAnimationState.IDLE,
  })
  animationState: PetAnimationState;

  // Níveis de sobrevivência (0–100)
  @Column({ name: 'water_level', type: 'int', default: 80 })
  waterLevel: number;

  @Column({ name: 'nutrition_level', type: 'int', default: 80 })
  nutritionLevel: number;

  // Experiência acumulada cuidando do pet.
  @Column({ type: 'int', default: 0 })
  xp: number;

  // Progressão nova: 1–100, derivada de XP/streak no serviço de gamificação
  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ name: 'xp_to_next_level', type: 'int', default: 100 })
  xpToNextLevel: number;

  @Column({
    name: 'equipped_items',
    type: process.env.DATABASE_TYPE === 'postgres' ? 'jsonb' : 'simple-json',
    nullable: true,
  })
  equippedItems: PetEquippedItems | null;

  // Âncora do decaimento preguiçoso dos níveis
  @Column({
    name: 'last_decay_at',
    type: process.env.DATABASE_TYPE === 'postgres' ? 'timestamp' : 'datetime',
    nullable: true,
  })
  lastDecayAt: Date | null;

  // Penalidade orgânica: a rotina da meia-noite marca o pet como triste/doente
  // quando o dia termina incompleto (sem freeze). Curada quando a criança
  // volta a completar todos os combinados do dia.
  @Column({ name: 'sick_since', type: 'date', nullable: true })
  sickSince: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

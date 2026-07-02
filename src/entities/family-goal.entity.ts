import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Meta cooperativa da família ("Cofrinho Compartilhado"):
 * as crianças depositam estrelas do próprio saldo até atingir o alvo
 * (ex: "Acampamento dos Escoteiros"). O saldo depositado sai do saldo
 * individual — depósitos ficam registrados no ledger GoalDeposit.
 */
export enum FamilyGoalStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('family_goals')
@Index(['familyId', 'status'])
export class FamilyGoal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Família dona da meta (id do responsável)
  @Column({ name: 'family_id', type: 'text' })
  familyId: string;

  @Column()
  title: string;

  @Column({ default: '🎯' })
  emoji: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'target_stars', type: 'int' })
  targetStars: number;

  // Desnormalizado para leitura rápida; a fonte de verdade auditável
  // é a soma dos GoalDeposit (atualizados na mesma transação)
  @Column({ name: 'deposited_stars', type: 'int', default: 0 })
  depositedStars: number;

  @Column({
    type: 'text',
    default: FamilyGoalStatus.ACTIVE,
  })
  status: FamilyGoalStatus;

  @Column({
    name: 'completed_at',
    type: process.env.DATABASE_TYPE === 'postgres' ? 'timestamp' : 'datetime',
    nullable: true,
  })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

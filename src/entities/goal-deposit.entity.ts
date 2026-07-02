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
import { FamilyGoal } from './family-goal.entity';

// Ledger imutável de depósitos no Cofrinho: quem depositou, quanto e quando.
// O débito no saldo da criança e o crédito na meta acontecem na mesma
// transação (Fase 2) — este registro é a trilha de auditoria.
@Entity('goal_deposits')
@Index(['goalId'])
export class GoalDeposit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'goal_id' })
  goalId: string;

  @ManyToOne(() => FamilyGoal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'goal_id' })
  goal: FamilyGoal;

  // Criança que depositou as estrelas do próprio saldo
  @Column({ name: 'child_id' })
  childId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_id' })
  child: User;

  @Column({ type: 'int' })
  amount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

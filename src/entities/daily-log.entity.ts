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
import { Task } from './task.entity';

/**
 * Fluxo de aprovação da execução de uma tarefa:
 *  PENDING   → tarefa do dia ainda não feita
 *  COMPLETED → criança marcou como feita, aguardando o responsável
 *  APPROVED  → responsável aprovou; estrelas são creditadas neste momento
 */
export enum TaskExecutionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  APPROVED = 'approved',
}

@Entity('daily_logs')
@Index(['userId', 'date', 'taskId'], { unique: true })
export class DailyLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'task_id' })
  taskId: string;

  /**
   * @deprecated Mantido por compatibilidade com dados existentes.
   * A fonte de verdade é `status`; este campo é derivado
   * (completed = status !== PENDING).
   */
  @Column({ default: false })
  completed: boolean;

  @Column({
    type: 'text',
    default: TaskExecutionStatus.PENDING,
  })
  status: TaskExecutionStatus;

  @Column({
    name: 'completed_at',
    type: process.env.DATABASE_TYPE === 'postgres' ? 'timestamp' : 'datetime',
    nullable: true,
  })
  completedAt: Date | null;

  @Column({
    name: 'approved_at',
    type: process.env.DATABASE_TYPE === 'postgres' ? 'timestamp' : 'datetime',
    nullable: true,
  })
  approvedAt: Date | null;

  // Responsável que aprovou a execução
  @Column({ name: 'approved_by_id', type: 'text', nullable: true })
  approvedById: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.dailyLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Task, (task) => task.dailyLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;
}

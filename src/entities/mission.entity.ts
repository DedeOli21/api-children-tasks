import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Ciclo de vida de uma missão:
 *  INBOX     → criada pelo professor, aguardando o responsável alocar
 *  SCHEDULED → alocada pelo responsável em um dia específico
 *  COMPLETED → criança marcou como feita, aguardando aprovação
 *  APPROVED  → responsável aprovou; estrelas creditadas neste momento
 */
export enum MissionStatus {
  INBOX = 'inbox',
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  APPROVED = 'approved',
}

// Tarefa proposta pelo professor (ex: "Dever de Matemática") que entra na
// caixa de entrada do responsável até ser alocada no cronograma da criança.
@Entity('missions')
@Index(['assignedToId', 'status'])
@Index(['assignedToId', 'scheduledDate'])
export class Mission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'icon_emoji', default: '📚' })
  iconEmoji: string;

  @Column({
    type: 'text',
    default: MissionStatus.INBOX,
  })
  status: MissionStatus;

  // Professor que propôs a missão
  @Column({ name: 'created_by_id' })
  createdById: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  // Criança que deve executá-la
  @Column({ name: 'assigned_to_id' })
  assignedToId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo: User;

  // Dia em que o responsável alocou a missão (null enquanto está na inbox)
  @Column({ name: 'scheduled_date', type: 'date', nullable: true })
  scheduledDate: string | null;

  // Estrelas liberadas quando o responsável aprova
  @Column({ name: 'stars_reward', type: 'int', default: 1 })
  starsReward: number;

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

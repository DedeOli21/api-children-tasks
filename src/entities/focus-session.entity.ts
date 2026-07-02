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
import { Mission } from './mission.entity';

/**
 * Sessão do Modo Foco (pomodoro lúdico):
 *  RUNNING   → cronômetro rodando na tela da criança
 *  COMPLETED → a criança sustentou o foco até o fim
 *  ABANDONED → interrompida antes do tempo
 */
export enum FocusSessionStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

@Entity('focus_sessions')
@Index(['childId', 'startedAt'])
export class FocusSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'child_id' })
  childId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_id' })
  child: User;

  // Missão acadêmica associada (opcional: foco livre também vale)
  @Column({ name: 'mission_id', type: 'text', nullable: true })
  missionId: string | null;

  @ManyToOne(() => Mission, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'mission_id' })
  mission: Mission | null;

  // Duração planejada do pomodoro (minutos)
  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes: number;

  @Column({
    type: 'text',
    default: FocusSessionStatus.RUNNING,
  })
  status: FocusSessionStatus;

  @Column({
    name: 'started_at',
    type: process.env.DATABASE_TYPE === 'postgres' ? 'timestamp' : 'datetime',
  })
  startedAt: Date;

  @Column({
    name: 'ended_at',
    type: process.env.DATABASE_TYPE === 'postgres' ? 'timestamp' : 'datetime',
    nullable: true,
  })
  endedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

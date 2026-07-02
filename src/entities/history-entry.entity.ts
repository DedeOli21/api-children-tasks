import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum HistoryType {
  TASK_COMPLETE = 'task_complete',
  PENALTY = 'penalty',
  REWARD_REDEEM = 'reward_redeem',
  STREAK_FREEZE_USED = 'streak_freeze_used',
  STARS_ADD = 'stars_add',
  STARS_SUBTRACT = 'stars_subtract',
}

@Entity('history_entries')
export class HistoryEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'text',
    enum: HistoryType,
  })
  type: HistoryType;

  @Column()
  description: string;

  @Column({ name: 'stars_change', default: 0 })
  starsChange: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.historyEntries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}

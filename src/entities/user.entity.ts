import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { DailyLog } from './daily-log.entity';
import { HistoryEntry } from './history-entry.entity';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'text',
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ name: 'current_stars', default: 0 })
  currentStars: number;

  @Column({ name: 'current_streak', default: 0 })
  currentStreak: number;

  @Column({ name: 'last_streak_date', type: 'date', nullable: true })
  lastStreakDate: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => DailyLog, (dailyLog) => dailyLog.user)
  dailyLogs: DailyLog[];

  @OneToMany(() => HistoryEntry, (history) => history.user)
  historyEntries: HistoryEntry[];
}


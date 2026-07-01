import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { DailyLog } from './daily-log.entity';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Família dona da tarefa (id do responsável)
  @Column({ name: 'family_id', type: 'text', nullable: true })
  familyId: string | null;

  @Column()
  title: string;

  @Column({ name: 'icon_emoji' })
  iconEmoji: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => DailyLog, (dailyLog) => dailyLog.task)
  dailyLogs: DailyLog[];
}


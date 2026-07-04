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
import { TaskTemplate } from './task-template.entity';

export enum ActiveTaskStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  APPROVED = 'approved',
}

// Tarefa concreta do dia que a criança visualiza e executa.
@Entity('active_tasks')
@Index(['childId', 'date'])
@Index(['templateId', 'childId', 'date'], { unique: true })
export class ActiveTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id', type: 'text' })
  templateId: string;

  @ManyToOne(() => TaskTemplate, (template) => template.activeTasks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template: TaskTemplate;

  @Column({ name: 'family_id', type: 'text' })
  familyId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'family_id' })
  family: User;

  @Column({ name: 'child_id', type: 'text' })
  childId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_id' })
  child: User;

  @Column({ type: 'date' })
  date: string;

  @Column()
  title: string;

  @Column({ default: '⭐' })
  emoji: string;

  @Column({ name: 'reward_stars', type: 'int', default: 1 })
  rewardStars: number;

  @Column({
    type: 'text',
    default: ActiveTaskStatus.PENDING,
  })
  status: ActiveTaskStatus;

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

  @Column({ name: 'approved_by_id', type: 'text', nullable: true })
  approvedById: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

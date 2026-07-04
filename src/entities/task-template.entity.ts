import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { ActiveTask } from './active-task.entity';

export enum TaskType {
  FIXED = 'fixed',
  EXTRA = 'extra',
}

export enum RecurrenceDay {
  SUNDAY = 'sunday',
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
}

const recurrenceDaysColumn =
  process.env.DATABASE_TYPE === 'postgres'
    ? ({
        name: 'recurrence_days',
        type: 'text' as const,
        array: true,
        default: () => "'{}'",
      } as const)
    : ({
        name: 'recurrence_days',
        type: 'simple-json' as const,
        default: '[]',
      } as const);

// Fonte de verdade para uma tarefa configurada pelo responsável.
@Entity('task_templates')
@Index(['familyId', 'childId'])
@Index(['childId', 'taskType', 'active'])
export class TaskTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column()
  title: string;

  @Column({ default: '⭐' })
  emoji: string;

  @Column({ name: 'reward_stars', type: 'int', default: 1 })
  rewardStars: number;

  @Column({
    name: 'task_type',
    type: 'text',
    default: TaskType.FIXED,
  })
  taskType: TaskType;

  @Column(recurrenceDaysColumn)
  recurrenceDays: RecurrenceDay[];

  @Column({ name: 'scheduled_date', type: 'date', nullable: true })
  scheduledDate: string | null;

  @Column({ default: true })
  active: boolean;

  @OneToMany(() => ActiveTask, (activeTask) => activeTask.template)
  activeTasks: ActiveTask[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

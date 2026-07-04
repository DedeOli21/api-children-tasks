import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Task } from './task.entity';
import { User } from './user.entity';
import { RecurrenceDay } from './task-template.entity';

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

@Entity('routines')
@Index(['familyId', 'childId'])
export class Routine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Família dona da rotina (id do responsável)
  @Column({ name: 'family_id', type: 'text', nullable: true })
  familyId: string | null;

  @Column({ name: 'child_id', type: 'text', nullable: true })
  childId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_id' })
  child: User | null;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  emoji: string;

  @Column({ name: 'time_of_day', nullable: true })
  timeOfDay: string; // 'morning', 'afternoon', 'evening', 'night'

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'scheduled_time', nullable: true })
  scheduledTime: string; // Formato: "HH:mm" (ex: "08:30")

  @Column(recurrenceDaysColumn)
  recurrenceDays: RecurrenceDay[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToMany(() => Task)
  @JoinTable({
    name: 'routine_tasks',
    joinColumn: { name: 'routine_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'task_id', referencedColumnName: 'id' },
  })
  tasks: Task[];
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Task } from './task.entity';

@Entity('routines')
export class Routine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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


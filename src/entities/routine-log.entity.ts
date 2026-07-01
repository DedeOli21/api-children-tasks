import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Routine } from './routine.entity';

@Entity('routine_logs')
@Unique(['userId', 'routineId', 'date'])
export class RoutineLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'routine_id' })
  routineId: string;

  @Column()
  date: string; // Formato: "YYYY-MM-DD"

  @Column({ default: false })
  completed: boolean;

  // Tipo compatível com SQLite (dev) e PostgreSQL (prod)
  @Column({
    name: 'completed_at',
    type: process.env.DATABASE_TYPE === 'postgres' ? 'timestamp' : 'datetime',
    nullable: true,
  })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Routine)
  @JoinColumn({ name: 'routine_id' })
  routine: Routine;
}


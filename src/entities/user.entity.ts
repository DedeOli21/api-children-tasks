import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DailyLog } from './daily-log.entity';
import { HistoryEntry } from './history-entry.entity';

export enum UserRole {
  PARENT = 'parent',
  CHILD = 'child',
  TEACHER = 'teacher',
  THERAPIST = 'therapist',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  // Para responsáveis/professores é o email; para crianças é o nome de usuário
  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'text',
    default: UserRole.PARENT,
  })
  role: UserRole;

  // Responsável dono da conta da criança (apenas para role = child)
  @Column({ name: 'parent_id', type: 'text', nullable: true })
  parentId: string | null;

  @ManyToOne(() => User, (user) => user.children, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: User | null;

  @OneToMany(() => User, (user) => user.parent)
  children: User[];

  // Código para o professor vincular o aluno (apenas para role = child)
  @Column({ name: 'invite_code', type: 'text', nullable: true, unique: true })
  inviteCode: string | null;

  @Column({ name: 'current_stars', default: 0 })
  currentStars: number;

  @Column({ name: 'current_streak', default: 0 })
  currentStreak: number;

  @Column({ name: 'last_streak_date', type: 'date', nullable: true })
  lastStreakDate: string | null;

  // Maior sequência já alcançada (troféu de gamificação)
  @Column({ name: 'longest_streak', default: 0 })
  longestStreak: number;

  // Inventário de "congelamentos": protegem o streak em um dia ruim
  @Column({ name: 'streak_freezes', default: 0 })
  streakFreezes: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => DailyLog, (dailyLog) => dailyLog.user)
  dailyLogs: DailyLog[];

  @OneToMany(() => HistoryEntry, (history) => history.user)
  historyEntries: HistoryEntry[];
}

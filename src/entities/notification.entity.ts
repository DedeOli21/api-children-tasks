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

/**
 * Tipos de notificação inteligente por destinatário:
 *  criança     → PET_THIRSTY/PET_SICK ("Sua planta está com sede!")
 *  responsável → APPROVAL_PENDING ("Estrelas da terapeuta aguardando aprovação!")
 *  professor   → WEEKLY_SUMMARY (resumo semanal dos alunos)
 */
export enum NotificationType {
  PET_THIRSTY = 'pet_thirsty',
  PET_SICK = 'pet_sick',
  APPROVAL_PENDING = 'approval_pending',
  WEEKLY_SUMMARY = 'weekly_summary',
  DAILY_PENALTY = 'daily_penalty',
  GENERAL = 'general',
}

// Caixa de notificações in-app; push/email são canais de entrega que
// consomem estes registros (Fase 2+). dedupeKey evita spam do mesmo aviso.
@Entity('notifications')
@Index(['userId', 'readAt'])
@Index(['userId', 'dedupeKey'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'text',
    default: NotificationType.GENERAL,
  })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  // Chave de deduplicação (ex: "pet_thirsty:2026-07-03") — no máximo um
  // aviso do mesmo assunto por dia
  @Column({ name: 'dedupe_key', type: 'text', nullable: true })
  dedupeKey: string | null;

  @Column({
    name: 'read_at',
    type: process.env.DATABASE_TYPE === 'postgres' ? 'timestamp' : 'datetime',
    nullable: true,
  })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

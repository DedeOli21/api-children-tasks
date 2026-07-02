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
 * Bonificação sugerida pela terapeuta:
 *  PENDING  → aguardando decisão do responsável
 *  APPROVED → estrelas creditadas no saldo da criança (única via de crédito)
 *  REJECTED → recusada; nenhuma estrela é creditada
 */
export enum StarRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('star_requests')
@Index(['childId', 'status'])
export class StarRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'child_id' })
  childId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_id' })
  child: User;

  @Column({ type: 'int' })
  amount: number;

  // Justificativa obrigatória — validada no DTO (Fase 2)
  @Column({ type: 'text' })
  reason: string;

  @Column({
    type: 'text',
    default: StarRequestStatus.PENDING,
  })
  status: StarRequestStatus;

  // Terapeuta que sugeriu a bonificação
  @Column({ name: 'created_by_id' })
  createdById: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  // Responsável que aprovou/recusou
  @Column({ name: 'approved_by_id', type: 'text', nullable: true })
  approvedById: string | null;

  @Column({
    name: 'resolved_at',
    type: process.env.DATABASE_TYPE === 'postgres' ? 'timestamp' : 'datetime',
    nullable: true,
  })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

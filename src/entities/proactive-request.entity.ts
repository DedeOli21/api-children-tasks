import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum ProactiveCategoryIcon {
  STUDIES = 'studies',
  ORGANIZATION = 'organization',
}

export enum ProactiveRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  ADJUSTED = 'adjusted',
  REJECTED = 'rejected',
}

/**
 * Boa ação criada pela própria criança.
 * Nada credita estrelas até o responsável aprovar ou ajustar a solicitação.
 */
@Entity('proactive_requests')
@Index(['familyId', 'status', 'createdAt'])
@Index(['childId', 'status'])
export class ProactiveRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'family_id' })
  familyId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'family_id' })
  family: User;

  @Column({ name: 'child_id' })
  childId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_id' })
  child: User;

  @Column({ name: 'category_icon', type: 'text' })
  categoryIcon: ProactiveCategoryIcon;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'suggested_stars', type: 'int' })
  suggestedStars: number;

  @Column({ name: 'final_stars', type: 'int', nullable: true })
  finalStars: number | null;

  @Column({
    type: 'text',
    default: ProactiveRequestStatus.PENDING,
  })
  status: ProactiveRequestStatus;

  @Column({ name: 'reviewed_by_id', type: 'text', nullable: true })
  reviewedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy: User | null;

  @Column({
    name: 'reviewed_at',
    type: process.env.DATABASE_TYPE === 'postgres' ? 'timestamp' : 'datetime',
    nullable: true,
  })
  reviewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

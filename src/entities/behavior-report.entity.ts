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

// Relatório comportamental diário escrito pelo professor, visível ao responsável
@Entity('behavior_reports')
@Index(['childId', 'date'])
export class BehaviorReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'child_id' })
  childId: string;

  @Column({ name: 'teacher_id' })
  teacherId: string;

  @Column({ type: 'date' })
  date: string;

  // Avaliação do dia de 1 (difícil) a 5 (excelente)
  @Column({ type: 'int', nullable: true })
  rating: number | null;

  @Column({ type: 'text' })
  text: string;

  // Estrelas concedidas junto com este relatório (0 = nenhuma)
  @Column({ name: 'stars_awarded', default: 0 })
  starsAwarded: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_id' })
  child: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;
}

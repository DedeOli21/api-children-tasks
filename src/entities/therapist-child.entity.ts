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

// Vínculo terapeuta ↔ criança, criado pelo responsável da criança.
// Uma terapeuta pode acompanhar crianças de famílias diferentes.
@Entity('therapist_children')
@Index(['therapistId', 'childId'], { unique: true })
export class TherapistChild {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'therapist_id' })
  therapistId: string;

  @Column({ name: 'child_id' })
  childId: string;

  // Responsável que criou o vínculo (auditoria de quem autorizou o acesso)
  @Column({ name: 'created_by_id' })
  createdById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'therapist_id' })
  therapist: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_id' })
  child: User;
}

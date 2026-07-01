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

// Vínculo professor ↔ aluno (criado via código de convite da criança)
@Entity('teacher_students')
@Index(['teacherId', 'childId'], { unique: true })
export class TeacherStudent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'teacher_id' })
  teacherId: string;

  @Column({ name: 'child_id' })
  childId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_id' })
  child: User;
}

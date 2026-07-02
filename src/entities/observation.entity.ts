import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User, UserRole } from './user.entity';

export enum ObservationType {
  CLINICAL = 'clinical', // nota clínica (terapeuta)
  BEHAVIORAL = 'behavioral', // nota comportamental (professor/terapeuta)
  GENERAL = 'general',
}

/**
 * Registro imutável de observações sobre a criança.
 * Imutabilidade é garantida pela ausência de endpoints de edição/remoção
 * (não há coluna de update) — o histórico clínico não pode ser reescrito.
 * Visibilidade 'adults' restringe a leitura a responsável/professor/terapeuta.
 */
@Entity('observations')
@Index(['childId', 'date'])
export class Observation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'child_id' })
  childId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_id' })
  child: User;

  @Column({ name: 'author_id' })
  authorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  // Snapshot do papel do autor no momento do registro
  @Column({ name: 'author_role', type: 'text' })
  authorRole: UserRole;

  @Column({ type: 'date' })
  date: string;

  @Column({
    type: 'text',
    default: ObservationType.GENERAL,
  })
  type: ObservationType;

  @Column({ type: 'text' })
  text: string;

  // 'adults' = visível apenas para responsável/professor/terapeuta
  @Column({ type: 'text', default: 'adults' })
  visibility: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

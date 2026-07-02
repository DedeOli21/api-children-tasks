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
 * Mensagem direta entre adultos (professor ↔ terapeuta), sempre no
 * contexto de uma criança. A criança nunca tem acesso (RBAC na Fase 2).
 */
@Entity('messages')
@Index(['childId', 'createdAt'])
@Index(['recipientId', 'readAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Criança que dá contexto à conversa
  @Column({ name: 'child_id' })
  childId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_id' })
  child: User;

  @Column({ name: 'sender_id' })
  senderId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ name: 'recipient_id' })
  recipientId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @Column({ type: 'text' })
  text: string;

  // Preenchido quando o destinatário lê (inbox com não-lidas)
  @Column({
    name: 'read_at',
    type: process.env.DATABASE_TYPE === 'postgres' ? 'timestamp' : 'datetime',
    nullable: true,
  })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

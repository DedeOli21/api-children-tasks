import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('penalties')
export class Penalty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Família dona da penalidade (id do responsável)
  @Column({ name: 'family_id', type: 'text', nullable: true })
  familyId: string | null;

  @Column()
  title: string;

  @Column()
  emoji: string;

  @Column({ default: 1 })
  amount: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}


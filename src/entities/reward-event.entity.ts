import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Evento Surpresa ativado pelo responsável (ex: "Estrelas em Dobro no
 * fim de semana"). Enquanto vigente (startsAt <= hoje <= endsAt e active),
 * todo crédito de estrelas por aprovação é multiplicado — o multiplicador
 * do evento compõe com o multiplicador de streak no momento do crédito.
 */
@Entity('reward_events')
@Index(['familyId', 'active'])
export class RewardEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Família dona do evento (id do responsável)
  @Column({ name: 'family_id', type: 'text' })
  familyId: string;

  @Column()
  name: string;

  @Column({ default: '🎉' })
  emoji: string;

  // 2 = estrelas em dobro, 3 = triplo (limite validado no DTO da Fase 2)
  @Column({ type: 'int', default: 2 })
  multiplier: number;

  @Column({ name: 'starts_at', type: 'date' })
  startsAt: string;

  @Column({ name: 'ends_at', type: 'date' })
  endsAt: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Configurações da família (uma linha por responsável), criadas sob demanda
 * com defaults seguros. Controlam a "penalidade tripla" da meia-noite:
 * dia incompleto sem freeze → streak zera + estrelas deduzidas + planta doente.
 */
@Entity('family_settings')
export class FamilySettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // id do responsável (mesma chave de família usada nos catálogos)
  @Column({ name: 'family_id', type: 'text', unique: true })
  familyId: string;

  // Liga/desliga a dedução automática de estrelas (streak zerar é sempre ativo)
  @Column({ name: 'apply_daily_penalty', default: true })
  applyDailyPenalty: boolean;

  // Estrelas deduzidas por dia incompleto (nunca deixa o saldo negativo)
  @Column({ name: 'daily_penalty_stars', type: 'int', default: 1 })
  dailyPenaltyStars: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

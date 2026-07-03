import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * A Planta Virtual da criança (mascote botânico, estilo Pou/Tamagotchi).
 *
 * Guarda apenas o estado do "ser vivo": níveis de sobrevivência e XP.
 * O que está equipado (espécie/cenário/efeito) mora no InventoryItem
 * com a flag equipped — uma única fonte de verdade para posses.
 *
 * Os níveis decaem com o tempo (decaimento preguiçoso calculado a partir
 * de lastDecayAt na Fase 2); regar/alimentar consome itens do inventário,
 * restaura os níveis e rende XP. O estágio de crescimento é derivado do XP.
 */
@Entity('virtual_pets')
export class VirtualPet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Uma planta por criança
  @Column({ name: 'child_id', unique: true })
  childId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_id' })
  child: User;

  // A criança batiza a própria planta
  @Column({ default: 'Plantinha' })
  name: string;

  // Níveis de sobrevivência (0–100)
  @Column({ name: 'water_level', type: 'int', default: 80 })
  waterLevel: number;

  @Column({ name: 'nutrition_level', type: 'int', default: 80 })
  nutritionLevel: number;

  // Experiência acumulada cuidando da planta; o estágio (semente → broto →
  // planta → florida) é derivado do XP no serviço
  @Column({ type: 'int', default: 0 })
  xp: number;

  // Âncora do decaimento preguiçoso dos níveis
  @Column({
    name: 'last_decay_at',
    type: process.env.DATABASE_TYPE === 'postgres' ? 'timestamp' : 'datetime',
    nullable: true,
  })
  lastDecayAt: Date | null;

  // Penalidade orgânica: a rotina da meia-noite marca a planta como doente
  // quando o dia termina incompleto (sem freeze). Curada quando a criança
  // volta a completar todos os combinados do dia.
  @Column({ name: 'sick_since', type: 'date', nullable: true })
  sickSince: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

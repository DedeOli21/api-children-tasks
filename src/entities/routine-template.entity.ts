import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { RoutineTemplateTask } from './routine-template-task.entity';

// Rotina pré-configurada (ex: "Manhã de Escola", "Fim de Semana") que o
// responsável instancia rapidamente como tarefas reais de um dia.
@Entity('routine_templates')
export class RoutineTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Família dona do template (id do responsável)
  @Column({ name: 'family_id', type: 'text' })
  familyId: string;

  @Column()
  name: string;

  @Column({ default: '🗓️' })
  emoji: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => RoutineTemplateTask, (task) => task.template, {
    cascade: true,
  })
  tasks: RoutineTemplateTask[];
}

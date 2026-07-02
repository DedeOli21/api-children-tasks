import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RoutineTemplate } from './routine-template.entity';

// Item de um template de rotina (vira tarefa real ao instanciar o template)
@Entity('routine_template_tasks')
export class RoutineTemplateTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id' })
  templateId: string;

  @ManyToOne(() => RoutineTemplate, (template) => template.tasks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template: RoutineTemplate;

  @Column()
  title: string;

  @Column({ name: 'icon_emoji', default: '⭐' })
  iconEmoji: string;

  // Horário sugerido no formato "HH:mm" (opcional)
  @Column({ name: 'scheduled_time', type: 'text', nullable: true })
  scheduledTime: string | null;

  // 'morning' | 'afternoon' | 'night' (opcional)
  @Column({ name: 'time_of_day', type: 'text', nullable: true })
  timeOfDay: string | null;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;
}

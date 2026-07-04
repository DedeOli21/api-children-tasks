import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { RecurrenceDay, TaskType } from '../../entities';

export class CreateTaskTemplateDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe a criança (childId)' })
  childId: string;

  @IsString()
  @IsNotEmpty({ message: 'Título da tarefa é obrigatório' })
  title: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  emoji?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  rewardStars?: number;

  @IsOptional()
  @IsIn(Object.values(TaskType))
  taskType?: TaskType;

  @IsOptional()
  @IsArray()
  @IsIn(Object.values(RecurrenceDay), { each: true })
  recurrenceDays?: RecurrenceDay[];

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Data inválida (use AAAA-MM-DD)',
  })
  scheduledDate?: string;
}

import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TemplateTaskDto {
  @IsString()
  @IsNotEmpty({ message: 'Título da tarefa é obrigatório' })
  title: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  iconEmoji?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Horário inválido (use HH:mm)',
  })
  scheduledTime?: string;

  @IsOptional()
  @IsIn(['morning', 'afternoon', 'night'], {
    message: 'timeOfDay deve ser morning, afternoon ou night',
  })
  timeOfDay?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome do template é obrigatório' })
  name: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  emoji?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'O template precisa de pelo menos uma tarefa' })
  @ValidateNested({ each: true })
  @Type(() => TemplateTaskDto)
  tasks: TemplateTaskDto[];
}

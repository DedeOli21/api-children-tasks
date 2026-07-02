import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TemplateTaskDto } from './create-template.dto';

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  emoji?: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Quando enviado, substitui a lista de tarefas do template
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty({ message: 'O template precisa de pelo menos uma tarefa' })
  @ValidateNested({ each: true })
  @Type(() => TemplateTaskDto)
  tasks?: TemplateTaskDto[];
}

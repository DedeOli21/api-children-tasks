import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class InstantiateTemplateDto {
  // Criança que receberá as tarefas do template
  @IsUUID(undefined, { message: 'childId inválido' })
  childId: string;

  // Dia do cronograma (padrão: hoje)
  @IsOptional()
  @IsDateString({}, { message: 'Data inválida (use AAAA-MM-DD)' })
  date?: string;
}

import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateReportDto {
  // Data do relatório (padrão: hoje)
  @IsOptional()
  @IsDateString({}, { message: 'Data inválida (use AAAA-MM-DD)' })
  date?: string;

  // Avaliação do dia: 1 (difícil) a 5 (excelente)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsString()
  @IsNotEmpty({ message: 'O texto do relatório é obrigatório' })
  text: string;

  // Estrelas de desempenho concedidas junto com o relatório
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  starsAwarded?: number;
}

import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome do evento é obrigatório' })
  name: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  emoji?: string;

  // 2 = estrelas em dobro, 3 = triplo
  @IsInt()
  @Min(2, { message: 'Multiplicador mínimo é 2x' })
  @Max(3, { message: 'Multiplicador máximo é 3x' })
  multiplier: number;

  @IsDateString({}, { message: 'startsAt inválido (use AAAA-MM-DD)' })
  startsAt: string;

  @IsDateString({}, { message: 'endsAt inválido (use AAAA-MM-DD)' })
  endsAt: string;
}

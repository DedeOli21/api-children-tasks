import { IsDateString } from 'class-validator';

export class AllocateMissionDto {
  // Dia do cronograma da criança em que a missão será executada
  @IsDateString({}, { message: 'Data inválida (use AAAA-MM-DD)' })
  date: string;
}

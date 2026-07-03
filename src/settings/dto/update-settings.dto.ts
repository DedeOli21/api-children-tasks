import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsBoolean()
  applyDailyPenalty?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Penalidade mínima é 1 estrela' })
  @Max(10, { message: 'Penalidade máxima é 10 estrelas' })
  dailyPenaltyStars?: number;
}

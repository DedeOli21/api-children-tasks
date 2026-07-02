import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class StartFocusDto {
  // Missão acadêmica associada (opcional)
  @IsOptional()
  @IsUUID(undefined, { message: 'missionId inválido' })
  missionId?: string;

  @IsInt()
  @Min(5, { message: 'Foco mínimo de 5 minutos' })
  @Max(60, { message: 'Foco máximo de 60 minutos' })
  durationMinutes: number;
}

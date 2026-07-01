import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class ApplyPenaltyDto {
  @IsUUID(undefined, { message: 'penaltyId inválido' })
  penaltyId: string;

  // Criança que recebe a penalidade
  @IsUUID(undefined, { message: 'childId inválido' })
  childId: string;

  // Quantidade customizada (padrão: valor da penalidade)
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;
}

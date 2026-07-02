import { IsInt, IsNotEmpty, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';

export class SuggestStarsDto {
  @IsUUID(undefined, { message: 'childId inválido' })
  childId: string;

  @IsInt({ message: 'Quantidade deve ser um número inteiro' })
  @Min(1, { message: 'Quantidade mínima é 1 estrela' })
  @Max(10, { message: 'Quantidade máxima é 10 estrelas' })
  amount: number;

  // Justificativa obrigatória — regra de negócio crítica
  @IsString()
  @IsNotEmpty({ message: 'O motivo da bonificação é obrigatório' })
  @MinLength(5, { message: 'Descreva o motivo com pelo menos 5 caracteres' })
  reason: string;
}

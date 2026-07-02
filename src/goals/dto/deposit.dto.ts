import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class DepositDto {
  // Estrelas do saldo individual da criança depositadas no cofrinho.
  // Validação estrita: inteiro positivo, sem espaço para injeção de pontos.
  @IsInt({ message: 'Quantidade deve ser um número inteiro' })
  @Min(1, { message: 'Depósito mínimo é 1 estrela' })
  @Max(1_000, { message: 'Depósito alto demais' })
  amount: number;

  // Responsável depositando em nome de um filho
  @IsOptional()
  @IsUUID(undefined, { message: 'childId inválido' })
  childId?: string;
}

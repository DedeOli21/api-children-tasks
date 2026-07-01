import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class UpdateStarsDto {
  @IsInt({ message: 'Quantidade deve ser um número inteiro' })
  @Min(1, { message: 'Quantidade mínima é 1' })
  amount: number;

  // Criança alvo (obrigatório para responsável)
  @IsUUID(undefined, { message: 'childId inválido' })
  childId: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reason?: string;
}

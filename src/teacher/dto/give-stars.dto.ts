import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class GiveStarsDto {
  @IsInt({ message: 'Quantidade deve ser um número inteiro' })
  @Min(1, { message: 'Quantidade mínima é 1 estrela' })
  @Max(10, { message: 'Quantidade máxima é 10 estrelas' })
  amount: number;

  @IsString()
  @IsNotEmpty({ message: 'Informe o motivo das estrelas' })
  reason: string;
}

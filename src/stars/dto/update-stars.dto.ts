import { IsNumber, IsPositive } from 'class-validator';

export class UpdateStarsDto {
  @IsNumber({}, { message: 'Quantidade deve ser um número' })
  @IsPositive({ message: 'Quantidade deve ser positiva' })
  amount: number;
}


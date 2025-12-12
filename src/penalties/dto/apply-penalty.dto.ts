import { IsNotEmpty, IsString, IsNumber, IsPositive, IsOptional } from 'class-validator';

export class ApplyPenaltyDto {
  @IsString()
  @IsNotEmpty({ message: 'ID da penalidade é obrigatório' })
  penaltyId: string;

  @IsNumber({}, { message: 'Quantidade deve ser um número' })
  @IsPositive({ message: 'Quantidade deve ser positiva' })
  @IsOptional()
  amount?: number;
}


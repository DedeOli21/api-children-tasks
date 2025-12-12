import { IsOptional, IsString, IsNumber, IsPositive, IsBoolean } from 'class-validator';

export class UpdatePenaltyDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  emoji?: string;

  @IsNumber({}, { message: 'Quantidade deve ser um número' })
  @IsPositive({ message: 'Quantidade deve ser positiva' })
  @IsOptional()
  amount?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}


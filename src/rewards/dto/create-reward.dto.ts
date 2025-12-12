import { IsNotEmpty, IsString, IsNumber, IsPositive, IsOptional } from 'class-validator';

export class CreateRewardDto {
  @IsString()
  @IsNotEmpty({ message: 'Título é obrigatório' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Emoji é obrigatório' })
  emoji: string;

  @IsNumber({}, { message: 'Custo deve ser um número' })
  @IsPositive({ message: 'Custo deve ser positivo' })
  @IsOptional()
  cost?: number;
}


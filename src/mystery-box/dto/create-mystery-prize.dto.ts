import { IsNotEmpty, IsString, IsEnum, IsOptional, IsNumber, IsPositive, Min } from 'class-validator';
import { MysteryPrizeRarity } from '../../entities';

export class CreateMysteryPrizeDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Emoji é obrigatório' })
  emoji: string;

  @IsEnum(MysteryPrizeRarity, { message: 'Raridade inválida' })
  rarity: MysteryPrizeRarity;

  @IsString()
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  description: string;

  @IsNumber({}, { message: 'Peso deve ser um número' })
  @IsPositive({ message: 'Peso deve ser positivo' })
  @Min(1, { message: 'Peso mínimo é 1' })
  @IsOptional()
  weight?: number; // Peso para seleção (maior = mais fácil de ganhar)
}


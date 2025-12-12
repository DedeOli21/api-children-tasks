import { IsOptional, IsString, IsEnum, IsBoolean, IsNumber, IsPositive, Min } from 'class-validator';
import { MysteryPrizeRarity } from '../../entities';

export class UpdateMysteryPrizeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  emoji?: string;

  @IsEnum(MysteryPrizeRarity)
  @IsOptional()
  rarity?: MysteryPrizeRarity;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber({}, { message: 'Peso deve ser um número' })
  @IsPositive({ message: 'Peso deve ser positivo' })
  @Min(1, { message: 'Peso mínimo é 1' })
  @IsOptional()
  weight?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}


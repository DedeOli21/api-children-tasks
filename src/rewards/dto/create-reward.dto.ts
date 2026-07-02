import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { RewardKind } from '../../entities';

export class CreateRewardDto {
  @IsString()
  @IsNotEmpty({ message: 'Título é obrigatório' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Emoji é obrigatório' })
  emoji: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt({ message: 'Custo deve ser um número inteiro' })
  @Min(1, { message: 'Custo deve ser positivo' })
  @Max(10_000, { message: 'Custo alto demais' })
  cost?: number;

  @IsOptional()
  @IsEnum(RewardKind, { message: 'Tipo de recompensa inválido' })
  kind?: RewardKind;
}

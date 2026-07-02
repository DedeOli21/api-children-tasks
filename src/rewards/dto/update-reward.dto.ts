import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { RewardKind } from '../../entities';

export class UpdateRewardDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  emoji?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  cost?: number;

  @IsOptional()
  @IsEnum(RewardKind, { message: 'Tipo de recompensa inválido' })
  kind?: RewardKind;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

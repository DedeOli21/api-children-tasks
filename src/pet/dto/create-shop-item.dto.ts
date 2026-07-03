import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ShopItemType } from '../../entities';

export class CreateShopItemDto {
  @IsIn(Object.values(ShopItemType), { message: 'Tipo de item inválido' })
  type: ShopItemType;

  @IsString()
  @IsNotEmpty({ message: 'Nome do item é obrigatório' })
  name: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  emoji?: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Validação estrita: preço inteiro positivo, sem espaço para injeção
  @IsInt()
  @Min(1, { message: 'Preço mínimo é 1 estrela' })
  @Max(500, { message: 'Preço máximo é 500 estrelas' })
  price: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  restoreAmount?: number;
}

export class UpdateShopItemDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

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
  @Max(500)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  restoreAmount?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ProactiveCategoryIcon } from '../../entities';

export class CreateProactiveRequestDto {
  @IsEnum(ProactiveCategoryIcon, {
    message: 'Categoria deve ser studies ou organization',
  })
  categoryIcon: ProactiveCategoryIcon;

  @IsString()
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  @MinLength(5, { message: 'Descreva a iniciativa com pelo menos 5 caracteres' })
  @MaxLength(500, { message: 'Descrição deve ter no máximo 500 caracteres' })
  description: string;

  @IsInt({ message: 'Estrelas sugeridas devem ser um número inteiro' })
  @Min(1, { message: 'Sugira pelo menos 1 estrela' })
  @Max(25, { message: 'Sugira no máximo 25 estrelas' })
  suggestedStars: number;
}

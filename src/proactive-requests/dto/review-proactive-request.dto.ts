import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ReviewProactiveRequestDto {
  @IsOptional()
  @IsInt({ message: 'Estrelas finais devem ser um número inteiro' })
  @Min(0, { message: 'Estrelas finais não podem ser negativas' })
  @Max(50, { message: 'Estrelas finais devem ser no máximo 50' })
  finalStars?: number;
}

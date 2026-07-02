import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateGoalDto {
  @IsString()
  @IsNotEmpty({ message: 'Título da meta é obrigatório' })
  title: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  emoji?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(5, { message: 'A meta precisa de pelo menos 5 estrelas' })
  @Max(10_000, { message: 'Meta alta demais' })
  targetStars: number;
}

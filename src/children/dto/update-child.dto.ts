import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateChildDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Nome não pode ser vazio' })
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(4, { message: 'Senha deve ter no mínimo 4 caracteres' })
  password?: string;
}

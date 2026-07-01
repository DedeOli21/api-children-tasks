import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateChildDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  // Nome de usuário para a criança entrar (sem email)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @MinLength(3, { message: 'Usuário deve ter no mínimo 3 caracteres' })
  @Matches(/^[a-z0-9._-]+$/, {
    message: 'Usuário deve conter apenas letras, números, ponto, hífen ou underline',
  })
  username: string;

  @IsString()
  @MinLength(4, { message: 'Senha deve ter no mínimo 4 caracteres' })
  password: string;
}

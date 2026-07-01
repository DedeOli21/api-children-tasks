import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  // Email (responsável/professor) ou nome de usuário (criança)
  @IsString()
  @IsNotEmpty({ message: 'Email ou usuário é obrigatório' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(4, { message: 'Senha deve ter no mínimo 4 caracteres' })
  password: string;
}

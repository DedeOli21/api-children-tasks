import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../entities';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  password: string;

  // Apenas responsável ou professor podem se registrar publicamente;
  // contas de criança são criadas pelo responsável
  @IsOptional()
  @IsIn([UserRole.PARENT, UserRole.TEACHER], {
    message: 'Tipo de conta inválido',
  })
  role?: UserRole.PARENT | UserRole.TEACHER;
}

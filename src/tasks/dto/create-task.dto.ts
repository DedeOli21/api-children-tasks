import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty({ message: 'Título é obrigatório' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Emoji do ícone é obrigatório' })
  iconEmoji: string;
}


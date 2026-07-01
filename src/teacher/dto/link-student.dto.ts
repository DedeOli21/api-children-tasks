import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class LinkStudentDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @IsNotEmpty({ message: 'Código de convite é obrigatório' })
  inviteCode: string;
}

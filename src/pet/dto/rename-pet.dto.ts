import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class RenamePetDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Dê um nome para a plantinha' })
  @MinLength(2, { message: 'Nome muito curto' })
  @MaxLength(20, { message: 'Nome muito longo (máx. 20 caracteres)' })
  name: string;
}

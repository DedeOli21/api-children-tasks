import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ObservationType } from '../../entities';

export class CreateObservationDto {
  @IsUUID(undefined, { message: 'childId inválido' })
  childId: string;

  @IsOptional()
  @IsDateString({}, { message: 'Data inválida (use AAAA-MM-DD)' })
  date?: string;

  @IsOptional()
  @IsIn(Object.values(ObservationType), { message: 'Tipo de observação inválido' })
  type?: ObservationType;

  @IsString()
  @IsNotEmpty({ message: 'O texto da observação é obrigatório' })
  @MinLength(5, { message: 'Descreva a observação com pelo menos 5 caracteres' })
  text: string;
}

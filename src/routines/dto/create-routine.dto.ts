import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  IsNumber,
  IsIn,
} from 'class-validator';

export class CreateRoutineDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty({ message: 'Emoji é obrigatório' })
  emoji: string;

  @IsString()
  @IsOptional()
  @IsIn(['morning', 'afternoon', 'evening', 'night'], {
    message: 'Período deve ser: morning, afternoon, evening ou night',
  })
  timeOfDay?: string;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsString()
  @IsOptional()
  scheduledTime?: string; // Formato: "HH:mm"

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  taskIds?: string[];
}


import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsIn,
} from 'class-validator';

export class UpdateRoutineDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  emoji?: string;

  @IsString()
  @IsOptional()
  @IsIn(['morning', 'afternoon', 'evening', 'night'], {
    message: 'Período deve ser: morning, afternoon, evening ou night',
  })
  timeOfDay?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

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


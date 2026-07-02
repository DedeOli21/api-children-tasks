import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateMissionDto {
  // Uma ou mais crianças (enviar para a "turma" = todos os alunos marcados)
  @IsArray()
  @ArrayNotEmpty({ message: 'Selecione pelo menos um aluno' })
  @IsUUID(undefined, { each: true, message: 'childIds contém id inválido' })
  childIds: string[];

  @IsString()
  @IsNotEmpty({ message: 'Título é obrigatório' })
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  iconEmoji?: string;

  // Estrelas liberadas quando o responsável aprovar
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  starsReward?: number;
}

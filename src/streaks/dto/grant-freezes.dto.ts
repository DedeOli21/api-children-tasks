import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class GrantFreezesDto {
  @IsUUID(undefined, { message: 'childId inválido' })
  childId: string;

  @IsInt()
  @Min(1, { message: 'Conceda pelo menos 1 congelamento' })
  @Max(10, { message: 'Máximo de 10 congelamentos por vez' })
  amount: number;
}

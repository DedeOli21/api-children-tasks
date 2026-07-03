import { IsUUID } from 'class-validator';

export class CarePetDto {
  // Item consumível do inventário (água ou comida) usado na planta
  @IsUUID(undefined, { message: 'itemId inválido' })
  shopItemId: string;
}

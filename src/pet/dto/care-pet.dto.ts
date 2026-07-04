import { IsUUID } from 'class-validator';

export class CarePetDto {
  // Item consumível do inventário (água ou comida) usado no pet
  @IsUUID(undefined, { message: 'itemId inválido' })
  shopItemId: string;
}

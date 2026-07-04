import { IsIn } from 'class-validator';

export class ChoosePetSpeciesDto {
  @IsIn(['dog', 'cat'], { message: 'Escolha cachorro ou gatinho' })
  species: 'dog' | 'cat';
}

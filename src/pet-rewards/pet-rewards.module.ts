import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  FamilyFeatureFlag,
  FeatureFlag,
  PetDrop,
  PetDropRule,
  PetInventoryItem,
  PetItem,
  VirtualPet,
} from '../entities';
import { PetRewardsService } from './pet-rewards.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FeatureFlag,
      FamilyFeatureFlag,
      PetDrop,
      PetDropRule,
      PetInventoryItem,
      PetItem,
      VirtualPet,
    ]),
  ],
  providers: [PetRewardsService],
  exports: [PetRewardsService],
})
export class PetRewardsModule {}

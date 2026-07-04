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
import { PetCatalogSeedService } from './pet-catalog-seed.service';
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
  providers: [PetCatalogSeedService, PetRewardsService],
  exports: [PetCatalogSeedService, PetRewardsService],
})
export class PetRewardsModule {}

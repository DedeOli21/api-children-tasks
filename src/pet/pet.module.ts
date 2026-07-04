import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PetService } from './pet.service';
import { PetController } from './pet.controller';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  VirtualPet,
  ShopItem,
  InventoryItem,
  PetInventoryItem,
  User,
  HistoryEntry,
} from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VirtualPet,
      ShopItem,
      InventoryItem,
      PetInventoryItem,
      User,
      HistoryEntry,
    ]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [PetController],
  providers: [PetService],
  exports: [PetService],
})
export class PetModule {}

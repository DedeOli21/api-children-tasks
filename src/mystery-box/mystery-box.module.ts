import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MysteryBoxService } from './mystery-box.service';
import { MysteryBoxController } from './mystery-box.controller';
import { MysteryPrize, User, HistoryEntry } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([MysteryPrize, User, HistoryEntry])],
  controllers: [MysteryBoxController],
  providers: [MysteryBoxService],
  exports: [MysteryBoxService],
})
export class MysteryBoxModule {}


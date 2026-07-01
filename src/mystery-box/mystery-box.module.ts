import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MysteryBoxService } from './mystery-box.service';
import { MysteryBoxController } from './mystery-box.controller';
import { AuthModule } from '../auth/auth.module';
import { MysteryPrize, User, HistoryEntry } from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([MysteryPrize, User, HistoryEntry]),
    AuthModule,
  ],
  controllers: [MysteryBoxController],
  providers: [MysteryBoxService],
  exports: [MysteryBoxService],
})
export class MysteryBoxModule {}

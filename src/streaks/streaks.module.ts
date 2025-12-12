import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StreaksService } from './streaks.service';
import { StreaksController } from './streaks.controller';
import { User, DailyLog, Task, HistoryEntry } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([User, DailyLog, Task, HistoryEntry])],
  controllers: [StreaksController],
  providers: [StreaksService],
  exports: [StreaksService],
})
export class StreaksModule {}


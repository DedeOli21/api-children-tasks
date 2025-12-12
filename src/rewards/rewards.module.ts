import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RewardsService } from './rewards.service';
import { RewardsController } from './rewards.controller';
import { Reward, User, HistoryEntry } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Reward, User, HistoryEntry])],
  controllers: [RewardsController],
  providers: [RewardsService],
  exports: [RewardsService],
})
export class RewardsModule {}


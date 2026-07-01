import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RewardsService } from './rewards.service';
import { RewardsController } from './rewards.controller';
import { AuthModule } from '../auth/auth.module';
import { Reward, User, HistoryEntry } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Reward, User, HistoryEntry]), AuthModule],
  controllers: [RewardsController],
  providers: [RewardsService],
  exports: [RewardsService],
})
export class RewardsModule {}

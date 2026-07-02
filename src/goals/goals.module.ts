import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoalsService } from './goals.service';
import { GoalsController } from './goals.controller';
import { AuthModule } from '../auth/auth.module';
import { FamilyGoal, GoalDeposit, User, HistoryEntry } from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([FamilyGoal, GoalDeposit, User, HistoryEntry]),
    AuthModule,
  ],
  controllers: [GoalsController],
  providers: [GoalsService],
  exports: [GoalsService],
})
export class GoalsModule {}

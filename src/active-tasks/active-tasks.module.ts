import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { PetRewardsModule } from '../pet-rewards/pet-rewards.module';
import { StreaksModule } from '../streaks/streaks.module';
import { ActiveTask } from '../entities';
import { ActiveTasksController } from './active-tasks.controller';
import { ActiveTasksService } from './active-tasks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ActiveTask]),
    AuthModule,
    EventsModule,
    PetRewardsModule,
    StreaksModule,
  ],
  controllers: [ActiveTasksController],
  providers: [ActiveTasksService],
  exports: [ActiveTasksService],
})
export class ActiveTasksModule {}

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { Task, DailyLog, User, HistoryEntry } from '../entities';
import { StreaksModule } from '../streaks/streaks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, DailyLog, User, HistoryEntry]),
    forwardRef(() => StreaksModule),
    AuthModule,
    EventsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActiveTask, TaskTemplate, User } from '../entities';
import { TaskSchedulerService } from './task-scheduler.service';

@Module({
  imports: [TypeOrmModule.forFeature([TaskTemplate, ActiveTask, User])],
  providers: [TaskSchedulerService],
  exports: [TaskSchedulerService],
})
export class TaskSchedulerModule {}

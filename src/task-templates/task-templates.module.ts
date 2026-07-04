import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { TaskSchedulerModule } from '../task-scheduler/task-scheduler.module';
import { TaskTemplate } from '../entities';
import { TaskTemplatesController } from './task-templates.controller';
import { TaskTemplatesService } from './task-templates.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskTemplate]),
    AuthModule,
    TaskSchedulerModule,
  ],
  controllers: [TaskTemplatesController],
  providers: [TaskTemplatesService],
  exports: [TaskTemplatesService],
})
export class TaskTemplatesModule {}

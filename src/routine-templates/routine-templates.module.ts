import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutineTemplatesService } from './routine-templates.service';
import { RoutineTemplatesController } from './routine-templates.controller';
import { AuthModule } from '../auth/auth.module';
import {
  RoutineTemplate,
  RoutineTemplateTask,
  Task,
  DailyLog,
} from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoutineTemplate, RoutineTemplateTask, Task, DailyLog]),
    AuthModule,
  ],
  controllers: [RoutineTemplatesController],
  providers: [RoutineTemplatesService],
  exports: [RoutineTemplatesService],
})
export class RoutineTemplatesModule {}

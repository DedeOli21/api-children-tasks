import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutinesService } from './routines.service';
import { RoutinesController } from './routines.controller';
import { Routine } from '../entities/routine.entity';
import { Task, DailyLog, RoutineLog } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Routine, Task, DailyLog, RoutineLog])],
  controllers: [RoutinesController],
  providers: [RoutinesService],
  exports: [RoutinesService],
})
export class RoutinesModule {}


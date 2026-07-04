import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { ActiveTask } from '../entities';
import { ActiveTasksController } from './active-tasks.controller';
import { ActiveTasksService } from './active-tasks.service';

@Module({
  imports: [TypeOrmModule.forFeature([ActiveTask]), AuthModule, EventsModule],
  controllers: [ActiveTasksController],
  providers: [ActiveTasksService],
  exports: [ActiveTasksService],
})
export class ActiveTasksModule {}

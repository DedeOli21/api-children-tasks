import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TherapistsService } from './therapists.service';
import { TherapistsController } from './therapists.controller';
import { AuthModule } from '../auth/auth.module';
import {
  User,
  TherapistChild,
  HistoryEntry,
  BehaviorReport,
  Observation,
  DailyLog,
} from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      TherapistChild,
      HistoryEntry,
      BehaviorReport,
      Observation,
      DailyLog,
    ]),
    AuthModule,
  ],
  controllers: [TherapistsController],
  providers: [TherapistsService],
  exports: [TherapistsService],
})
export class TherapistsModule {}

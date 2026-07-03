import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { AuthModule } from '../auth/auth.module';
import { HistoryEntry, Observation, BehaviorReport } from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([HistoryEntry, Observation, BehaviorReport]),
    AuthModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}

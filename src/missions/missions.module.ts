import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MissionsService } from './missions.service';
import { MissionsController } from './missions.controller';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { Mission, User, HistoryEntry } from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Mission, User, HistoryEntry]),
    AuthModule,
    EventsModule,
  ],
  controllers: [MissionsController],
  providers: [MissionsService],
  exports: [MissionsService],
})
export class MissionsModule {}

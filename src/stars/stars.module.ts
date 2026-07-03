import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StarsService } from './stars.service';
import { StarsController } from './stars.controller';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { User, HistoryEntry, StarRequest } from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, HistoryEntry, StarRequest]),
    AuthModule,
    EventsModule,
    NotificationsModule,
  ],
  controllers: [StarsController],
  providers: [StarsService],
  exports: [StarsService],
})
export class StarsModule {}

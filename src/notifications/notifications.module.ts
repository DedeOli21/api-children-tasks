import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification, User, TeacherStudent, Mission } from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User, TeacherStudent, Mission]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

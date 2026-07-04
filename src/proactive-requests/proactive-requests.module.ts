import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PetRewardsModule } from '../pet-rewards/pet-rewards.module';
import { ProactiveRequest, User } from '../entities';
import { ProactiveRequestsController } from './proactive-requests.controller';
import { ProactiveRequestsService } from './proactive-requests.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProactiveRequest, User]),
    AuthModule,
    NotificationsModule,
    PetRewardsModule,
  ],
  controllers: [ProactiveRequestsController],
  providers: [ProactiveRequestsService],
  exports: [ProactiveRequestsService],
})
export class ProactiveRequestsModule {}

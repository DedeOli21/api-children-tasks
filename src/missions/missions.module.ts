import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MissionsService } from './missions.service';
import { MissionsController } from './missions.controller';
import { AuthModule } from '../auth/auth.module';
import { Mission, User, HistoryEntry } from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Mission, User, HistoryEntry]),
    AuthModule,
  ],
  controllers: [MissionsController],
  providers: [MissionsService],
  exports: [MissionsService],
})
export class MissionsModule {}

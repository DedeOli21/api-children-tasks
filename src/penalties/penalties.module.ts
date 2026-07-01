import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PenaltiesService } from './penalties.service';
import { PenaltiesController } from './penalties.controller';
import { AuthModule } from '../auth/auth.module';
import { Penalty, User, HistoryEntry } from '../entities';
import { StreaksModule } from '../streaks/streaks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Penalty, User, HistoryEntry]),
    forwardRef(() => StreaksModule),
    AuthModule,
  ],
  controllers: [PenaltiesController],
  providers: [PenaltiesService],
  exports: [PenaltiesService],
})
export class PenaltiesModule {}

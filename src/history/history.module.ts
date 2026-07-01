import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoryService } from './history.service';
import { HistoryController } from './history.controller';
import { AuthModule } from '../auth/auth.module';
import { HistoryEntry } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([HistoryEntry]), AuthModule],
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [HistoryService],
})
export class HistoryModule {}

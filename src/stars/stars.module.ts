import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StarsService } from './stars.service';
import { StarsController } from './stars.controller';
import { User, HistoryEntry } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([User, HistoryEntry])],
  controllers: [StarsController],
  providers: [StarsService],
  exports: [StarsService],
})
export class StarsModule {}


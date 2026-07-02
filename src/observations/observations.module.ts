import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObservationsService } from './observations.service';
import { ObservationsController } from './observations.controller';
import { AuthModule } from '../auth/auth.module';
import { Observation } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Observation]), AuthModule],
  controllers: [ObservationsController],
  providers: [ObservationsService],
  exports: [ObservationsService],
})
export class ObservationsModule {}

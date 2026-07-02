import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FocusService } from './focus.service';
import { FocusController } from './focus.controller';
import { AuthModule } from '../auth/auth.module';
import { FocusSession, Mission } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([FocusSession, Mission]), AuthModule],
  controllers: [FocusController],
  providers: [FocusService],
  exports: [FocusService],
})
export class FocusModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherService } from './teacher.service';
import { TeacherController } from './teacher.controller';
import { AuthModule } from '../auth/auth.module';
import { User, TeacherStudent, BehaviorReport, HistoryEntry } from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, TeacherStudent, BehaviorReport, HistoryEntry]),
    AuthModule,
  ],
  controllers: [TeacherController],
  providers: [TeacherService],
})
export class TeacherModule {}

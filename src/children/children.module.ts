import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChildrenService } from './children.service';
import { ChildrenController } from './children.controller';
import { User, BehaviorReport } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([User, BehaviorReport])],
  controllers: [ChildrenController],
  providers: [ChildrenService],
  exports: [ChildrenService],
})
export class ChildrenModule {}

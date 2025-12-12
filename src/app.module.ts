import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { StarsModule } from './stars/stars.module';
import { TasksModule } from './tasks/tasks.module';
import { PenaltiesModule } from './penalties/penalties.module';
import { RewardsModule } from './rewards/rewards.module';
import { HistoryModule } from './history/history.module';
import { RoutinesModule } from './routines/routines.module';
import { StreaksModule } from './streaks/streaks.module';
import { MysteryBoxModule } from './mystery-box/mystery-box.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import {
  User,
  Task,
  DailyLog,
  Penalty,
  Reward,
  HistoryEntry,
  Routine,
  RoutineLog,
  MysteryPrize,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forRoot(
      process.env.DATABASE_TYPE === 'postgres'
        ? {
            type: 'postgres',
            url: process.env.DATABASE_URL,
            entities: [User, Task, DailyLog, Penalty, Reward, HistoryEntry, Routine, RoutineLog, MysteryPrize],
            synchronize: process.env.NODE_ENV !== 'production',
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
          }
        : {
            type: 'better-sqlite3',
            database: process.env.DATABASE_PATH || 'database.sqlite',
            entities: [User, Task, DailyLog, Penalty, Reward, HistoryEntry, Routine, RoutineLog, MysteryPrize],
            synchronize: process.env.NODE_ENV !== 'production',
          },
    ),
    AuthModule,
    StarsModule,
    TasksModule,
    PenaltiesModule,
    RewardsModule,
    HistoryModule,
    RoutinesModule,
    StreaksModule,
    MysteryBoxModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}

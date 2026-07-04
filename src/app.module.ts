import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
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
import { ChildrenModule } from './children/children.module';
import { TeacherModule } from './teacher/teacher.module';
import { MissionsModule } from './missions/missions.module';
import { RoutineTemplatesModule } from './routine-templates/routine-templates.module';
import { TherapistsModule } from './therapists/therapists.module';
import { ObservationsModule } from './observations/observations.module';
import { MessagesModule } from './messages/messages.module';
import { FocusModule } from './focus/focus.module';
import { GoalsModule } from './goals/goals.module';
import { EventsModule } from './events/events.module';
import { PetModule } from './pet/pet.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SettingsModule } from './settings/settings.module';
import { ReportsModule } from './reports/reports.module';
import { TaskSchedulerModule } from './task-scheduler/task-scheduler.module';
import { TaskTemplatesModule } from './task-templates/task-templates.module';
import { ActiveTasksModule } from './active-tasks/active-tasks.module';
import { LegacyMigrationService } from './database/legacy-migration.service';
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
  TeacherStudent,
  BehaviorReport,
  Mission,
  RoutineTemplate,
  RoutineTemplateTask,
  TherapistChild,
  StarRequest,
  Observation,
  Message,
  FocusSession,
  FamilyGoal,
  GoalDeposit,
  RewardEvent,
  ShopItem,
  VirtualPet,
  InventoryItem,
  FamilySettings,
  Notification,
  TaskTemplate,
  ActiveTask,
} from './entities';

const entities = [
  User,
  Task,
  DailyLog,
  Penalty,
  Reward,
  HistoryEntry,
  Routine,
  RoutineLog,
  MysteryPrize,
  TeacherStudent,
  BehaviorReport,
  Mission,
  RoutineTemplate,
  RoutineTemplateTask,
  TherapistChild,
  StarRequest,
  Observation,
  Message,
  FocusSession,
  FamilyGoal,
  GoalDeposit,
  RewardEvent,
  ShopItem,
  VirtualPet,
  InventoryItem,
  FamilySettings,
  Notification,
  TaskTemplate,
  ActiveTask,
];

// Em produção o schema não sincroniza sozinho; DB_SYNC=true permite uma
// sincronização controlada (ex.: primeiro deploy com novas tabelas/colunas).
const shouldSynchronize =
  process.env.NODE_ENV !== 'production' || process.env.DB_SYNC === 'true';

@Module({
  imports: [
    TypeOrmModule.forRoot(
      process.env.DATABASE_TYPE === 'postgres'
        ? {
            type: 'postgres',
            url: process.env.DATABASE_URL,
            entities,
            synchronize: shouldSynchronize,
            ssl:
              process.env.NODE_ENV === 'production'
                ? { rejectUnauthorized: false }
                : false,
          }
        : {
            type: 'better-sqlite3',
            database: process.env.DATABASE_PATH || 'database.sqlite',
            entities,
            synchronize: shouldSynchronize,
          },
    ),
    TypeOrmModule.forFeature(entities),
    // Limite global generoso; login/register têm limites mais duros via @Throttle
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    // Cron do motor de streaks (avaliação diária)
    ScheduleModule.forRoot(),
    AuthModule,
    StarsModule,
    TasksModule,
    PenaltiesModule,
    RewardsModule,
    HistoryModule,
    RoutinesModule,
    StreaksModule,
    MysteryBoxModule,
    ChildrenModule,
    TeacherModule,
    MissionsModule,
    RoutineTemplatesModule,
    TherapistsModule,
    ObservationsModule,
    MessagesModule,
    FocusModule,
    GoalsModule,
    EventsModule,
    PetModule,
    NotificationsModule,
    SettingsModule,
    ReportsModule,
    TaskSchedulerModule,
    TaskTemplatesModule,
    ActiveTasksModule,
  ],
  controllers: [AppController],
  providers: [
    LegacyMigrationService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
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

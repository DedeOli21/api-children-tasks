import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ActiveTask,
  DailyLog,
  HistoryEntry,
  RecurrenceDay,
  Task,
  TaskTemplate,
  TaskType,
  User,
  UserRole,
} from '../entities';
import { TaskSchedulerService } from './task-scheduler.service';

describe('TaskSchedulerService', () => {
  let moduleRef: TestingModule;
  let service: TaskSchedulerService;
  let userRepository: Repository<User>;
  let templateRepository: Repository<TaskTemplate>;
  let activeTaskRepository: Repository<ActiveTask>;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [
            User,
            Task,
            DailyLog,
            HistoryEntry,
            TaskTemplate,
            ActiveTask,
          ],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([User, TaskTemplate, ActiveTask]),
      ],
      providers: [TaskSchedulerService],
    }).compile();

    service = moduleRef.get(TaskSchedulerService);
    userRepository = moduleRef.get(getRepositoryToken(User));
    templateRepository = moduleRef.get(getRepositoryToken(TaskTemplate));
    activeTaskRepository = moduleRef.get(getRepositoryToken(ActiveTask));
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('instantiates matching templates once for a specific date', async () => {
    const parent = await userRepository.save(
      userRepository.create({
        name: 'Responsável',
        email: 'parent@test.local',
        password: 'secret',
        role: UserRole.PARENT,
      }),
    );
    const child = await userRepository.save(
      userRepository.create({
        name: 'Criança',
        email: 'child@test.local',
        password: 'secret',
        role: UserRole.CHILD,
        parentId: parent.id,
      }),
    );

    await templateRepository.save([
      templateRepository.create({
        familyId: parent.id,
        childId: child.id,
        title: 'Escovar os dentes',
        emoji: '🦷',
        rewardStars: 2,
        taskType: TaskType.FIXED,
        recurrenceDays: [RecurrenceDay.MONDAY, RecurrenceDay.TUESDAY],
      }),
      templateRepository.create({
        familyId: parent.id,
        childId: child.id,
        title: 'Lição de casa',
        emoji: '📚',
        rewardStars: 3,
        taskType: TaskType.EXTRA,
        recurrenceDays: [],
        scheduledDate: '2026-07-06',
      }),
      templateRepository.create({
        familyId: parent.id,
        childId: child.id,
        title: 'Arrumar a cama',
        emoji: '🛏️',
        rewardStars: 1,
        taskType: TaskType.FIXED,
        recurrenceDays: [RecurrenceDay.WEDNESDAY],
      }),
    ]);

    await expect(
      service.instantiateTasksForDate('2026-07-06', RecurrenceDay.MONDAY),
    ).resolves.toBe(2);
    await expect(
      service.instantiateTasksForDate('2026-07-06', RecurrenceDay.MONDAY),
    ).resolves.toBe(0);

    const activeTasks = await activeTaskRepository.find({
      where: { childId: child.id, date: '2026-07-06' },
      order: { title: 'ASC' },
    });

    expect(activeTasks).toHaveLength(2);
    expect(activeTasks.map((task) => task.title)).toEqual([
      'Escovar os dentes',
      'Lição de casa',
    ]);
    expect(activeTasks[0].rewardStars).toBe(2);
  });
});

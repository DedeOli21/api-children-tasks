import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  Task,
  DailyLog,
  TaskExecutionStatus,
  User,
  HistoryEntry,
  HistoryType,
  PetDropSourceType,
} from '../entities';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { StreaksService } from '../streaks/streaks.service';
import { EventsService } from '../events/events.service';
import {
  PetRewardResult,
  PetRewardsService,
} from '../pet-rewards/pet-rewards.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(DailyLog)
    private dailyLogRepository: Repository<DailyLog>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(HistoryEntry)
    private historyRepository: Repository<HistoryEntry>,
    @Inject(forwardRef(() => StreaksService))
    private streaksService: StreaksService,
    private eventsService: EventsService,
    private petRewardsService: PetRewardsService,
    private dataSource: DataSource,
  ) {}

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  async findAll(userId: string, familyId: string) {
    const tasks = await this.taskRepository.find({
      where: { active: true, familyId },
      order: { createdAt: 'ASC' },
    });

    const today = this.getTodayDate();

    // Buscar logs de hoje para o usuário
    const todayLogs = await this.dailyLogRepository.find({
      where: { userId, date: today },
    });

    const statusByTaskId = new Map(
      todayLogs.map((log) => [log.taskId, log.status]),
    );

    return tasks.map((task) => {
      const status = statusByTaskId.get(task.id) ?? TaskExecutionStatus.PENDING;
      return {
        ...task,
        status,
        completedToday: status !== TaskExecutionStatus.PENDING,
        approvedToday: status === TaskExecutionStatus.APPROVED,
      };
    });
  }

  async create(createTaskDto: CreateTaskDto, familyId: string) {
    const task = this.taskRepository.create({ ...createTaskDto, familyId });
    return this.taskRepository.save(task);
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, familyId: string) {
    const task = await this.taskRepository.findOne({
      where: { id, familyId, active: true },
    });

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    Object.assign(task, updateTaskDto);
    return this.taskRepository.save(task);
  }

  async delete(id: string, familyId: string) {
    const task = await this.taskRepository.findOne({
      where: { id, familyId, active: true },
    });

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    task.active = false;
    await this.taskRepository.save(task);
    return { message: 'Tarefa removida com sucesso' };
  }

  async completeTask(userId: string, taskId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const task = await this.taskRepository.findOne({
      where: { id: taskId, familyId: user.parentId ?? '', active: true },
    });

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    const today = this.getTodayDate();

    // Verificar se já existe um log para hoje
    let dailyLog = await this.dailyLogRepository.findOne({
      where: { userId, taskId, date: today },
    });

    if (dailyLog?.status === TaskExecutionStatus.APPROVED) {
      throw new BadRequestException('Tarefa já foi aprovada hoje');
    }

    if (dailyLog) {
      dailyLog.status = TaskExecutionStatus.COMPLETED;
      dailyLog.completed = true;
      dailyLog.completedAt = new Date();
    } else {
      dailyLog = this.dailyLogRepository.create({
        userId,
        taskId,
        date: today,
        completed: true,
        status: TaskExecutionStatus.COMPLETED,
        completedAt: new Date(),
      });
    }

    await this.dailyLogRepository.save(dailyLog);

    // O streak conta o esforço da criança (marcou tudo), mas as estrelas
    // só são creditadas quando o responsável aprova (approveLog)
    const streakInfo = await this.streaksService.updateStreak(userId);
    const child = await this.userRepository.findOneOrFail({
      where: { id: userId },
    });
    const petReward =
      child.parentId === null
        ? null
        : await this.dataSource.transaction((manager) =>
            this.petRewardsService.awardForCompletion(manager, {
              familyId: child.parentId as string,
              child,
              sourceType: PetDropSourceType.DAILY_TASK,
              sourceId: dailyLog.id,
            }),
          );

    return {
      task,
      dailyLog,
      status: dailyLog.status,
      currentStars: user.currentStars,
      starsEarned: 0,
      streak: streakInfo.streak,
      petReward,
      message: `Tarefa "${task.title}" enviada para aprovação! Aguardando o chefe aprovar 😄`,
    };
  }

  // Fila "Aguardando Revisão": execuções marcadas pela criança e ainda não aprovadas
  async pendingApproval(parentId: string, childId?: string) {
    const logs = await this.dailyLogRepository.find({
      where: {
        status: TaskExecutionStatus.COMPLETED,
        user: { parentId, ...(childId ? { id: childId } : {}) },
        task: { active: true },
      },
      relations: ['task', 'user'],
      order: { date: 'DESC', completedAt: 'ASC' },
      take: 100,
    });

    return logs.map((log) => ({
      logId: log.id,
      taskId: log.taskId,
      title: log.task?.title,
      iconEmoji: log.task?.iconEmoji,
      date: log.date,
      childId: log.userId,
      childName: log.user?.name,
      completedAt: log.completedAt,
    }));
  }

  // Aprovação do responsável: único ponto que credita as estrelas da tarefa
  async approveLog(parentId: string, logId: string) {
    const log = await this.dailyLogRepository.findOne({
      where: { id: logId },
      relations: ['task', 'user'],
    });

    if (!log) {
      throw new NotFoundException('Execução de tarefa não encontrada');
    }
    if (log.user?.parentId !== parentId) {
      throw new ForbiddenException('Essa tarefa não pertence à sua família');
    }
    if (log.status === TaskExecutionStatus.APPROVED) {
      throw new BadRequestException('Tarefa já foi aprovada');
    }
    if (log.status !== TaskExecutionStatus.COMPLETED) {
      throw new BadRequestException(
        'A criança ainda não marcou esta tarefa como feita',
      );
    }

    // Multiplicadores: streak da criança × Evento Surpresa vigente
    const child = log.user;
    const streakMultiplier = this.streaksService.getStreakMultiplier(
      child.currentStreak,
    );
    const { multiplier: eventMultiplier, event } =
      await this.eventsService.activeMultiplier(parentId);
    const starsToAdd = 1 * streakMultiplier * eventMultiplier;
    const taskTitle = log.task?.title ?? 'Tarefa';

    // Mudança de status, crédito e histórico na mesma transação:
    // ou a criança recebe tudo, ou nada muda.
    let petReward: PetRewardResult | null = null;

    await this.dataSource.transaction(async (manager) => {
      log.status = TaskExecutionStatus.APPROVED;
      log.approvedAt = new Date();
      log.approvedById = parentId;
      await manager.save(log);

      child.currentStars += starsToAdd;
      await manager.save(child);

      const bonuses = [
        streakMultiplier > 1 ? `${streakMultiplier}x streak` : null,
        event ? `${event.emoji} ${event.name}` : null,
      ]
        .filter(Boolean)
        .join(' + ');
      await manager.save(
        manager.create(HistoryEntry, {
          userId: child.id,
          type: HistoryType.TASK_COMPLETE,
          description: bonuses
            ? `Tarefa aprovada: ${taskTitle} (${bonuses})`
            : `Tarefa aprovada: ${taskTitle}`,
          starsChange: starsToAdd,
        }),
      );

      petReward = await this.petRewardsService.progressOnlyForCompletion(
        manager,
        child,
      );
    });

    return {
      logId: log.id,
      taskId: log.taskId,
      status: log.status,
      childId: child.id,
      currentStars: child.currentStars,
      starsEarned: starsToAdd,
      multiplier: streakMultiplier,
      eventMultiplier,
      petReward,
      message: `Tarefa "${taskTitle}" aprovada! +${starsToAdd} estrela(s) para ${child.name}`,
    };
  }

  async uncompleteTask(userId: string, taskId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const task = await this.taskRepository.findOne({
      where: { id: taskId, familyId: user.parentId ?? '', active: true },
    });

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    const today = this.getTodayDate();

    const dailyLog = await this.dailyLogRepository.findOne({
      where: { userId, taskId, date: today, completed: true },
    });

    if (!dailyLog) {
      throw new NotFoundException('Tarefa não estava completada hoje');
    }

    // Aprovada = estrelas já creditadas; desfazer exigiria estorno.
    // O responsável pode ajustar o saldo manualmente se necessário.
    if (dailyLog.status === TaskExecutionStatus.APPROVED) {
      throw new BadRequestException(
        'Tarefa já aprovada não pode ser desmarcada',
      );
    }

    dailyLog.completed = false;
    dailyLog.status = TaskExecutionStatus.PENDING;
    dailyLog.completedAt = null;
    await this.dailyLogRepository.save(dailyLog);

    return {
      task,
      dailyLog,
      status: dailyLog.status,
      currentStars: user.currentStars,
      message: `Tarefa "${task.title}" desmarcada`,
    };
  }

  async resetTasks(userId: string) {
    const today = this.getTodayDate();

    // Um único UPDATE em vez de N saves em loop.
    // Estrelas de execuções já aprovadas não são estornadas.
    const result = await this.dailyLogRepository.update(
      { userId, date: today, completed: true },
      {
        completed: false,
        status: TaskExecutionStatus.PENDING,
        completedAt: null,
        approvedAt: null,
        approvedById: null,
      },
    );

    return {
      message: 'Todas as tarefas foram resetadas para hoje',
      resetCount: result.affected ?? 0,
    };
  }
}

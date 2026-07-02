import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, DailyLog, User, HistoryEntry, HistoryType } from '../entities';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { StreaksService } from '../streaks/streaks.service';

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

    const completedTaskIds = new Set(
      todayLogs.filter((log) => log.completed).map((log) => log.taskId),
    );

    return tasks.map((task) => ({
      ...task,
      completedToday: completedTaskIds.has(task.id),
    }));
  }

  async create(createTaskDto: CreateTaskDto, familyId: string) {
    const task = this.taskRepository.create({ ...createTaskDto, familyId });
    return this.taskRepository.save(task);
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, familyId: string) {
    const task = await this.taskRepository.findOne({ where: { id, familyId } });

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    Object.assign(task, updateTaskDto);
    return this.taskRepository.save(task);
  }

  async delete(id: string, familyId: string) {
    const task = await this.taskRepository.findOne({ where: { id, familyId } });

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    await this.taskRepository.remove(task);
    return { message: 'Tarefa removida com sucesso' };
  }

  async completeTask(userId: string, taskId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const task = await this.taskRepository.findOne({
      where: { id: taskId, familyId: user.parentId ?? '' },
    });

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    const today = this.getTodayDate();

    // Verificar se já existe um log para hoje
    let dailyLog = await this.dailyLogRepository.findOne({
      where: { userId, taskId, date: today },
    });

    if (dailyLog) {
      dailyLog.completed = true;
    } else {
      dailyLog = this.dailyLogRepository.create({
        userId,
        taskId,
        date: today,
        completed: true,
      });
    }

    await this.dailyLogRepository.save(dailyLog);

    // Atualizar streak e obter multiplicador
    const streakInfo = await this.streaksService.updateStreak(userId);
    const multiplier = streakInfo.multiplier;
    const baseStars = 1;
    const starsToAdd = baseStars * multiplier;

    // Adicionar estrelas com multiplicador
    user.currentStars += starsToAdd;
    await this.userRepository.save(user);

    // Registrar no histórico
    const description = multiplier > 1
      ? `Completou tarefa: ${task.title} (${multiplier}x streak!)`
      : `Completou tarefa: ${task.title}`;
    
    const historyEntry = this.historyRepository.create({
      userId,
      type: HistoryType.TASK_COMPLETE,
      description,
      starsChange: starsToAdd,
    });
    await this.historyRepository.save(historyEntry);

    return {
      task,
      dailyLog,
      currentStars: user.currentStars,
      starsEarned: starsToAdd,
      multiplier,
      streak: streakInfo.streak,
      message: multiplier > 1
        ? `Tarefa "${task.title}" completada! +${starsToAdd} estrelas (${multiplier}x streak!)`
        : `Tarefa "${task.title}" completada! +${starsToAdd} estrela`,
    };
  }

  async uncompleteTask(userId: string, taskId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const task = await this.taskRepository.findOne({
      where: { id: taskId, familyId: user.parentId ?? '' },
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

    dailyLog.completed = false;
    await this.dailyLogRepository.save(dailyLog);

    // Remover 1 estrela (não deixar negativo)
    if (user.currentStars > 0) {
      user.currentStars -= 1;
      await this.userRepository.save(user);
    }

    return {
      task,
      dailyLog,
      currentStars: user.currentStars,
      message: `Tarefa "${task.title}" desmarcada. -1 estrela`,
    };
  }

  async resetTasks(userId: string) {
    const today = this.getTodayDate();

    // Um único UPDATE em vez de N saves em loop
    const result = await this.dailyLogRepository.update(
      { userId, date: today, completed: true },
      { completed: false },
    );

    return {
      message: 'Todas as tarefas foram resetadas para hoje',
      resetCount: result.affected ?? 0,
    };
  }
}


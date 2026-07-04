import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Routine } from '../entities/routine.entity';
import {
  DailyLog,
  RecurrenceDay,
  RoutineLog,
  Task,
  TaskExecutionStatus,
} from '../entities';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';

@Injectable()
export class RoutinesService {
  constructor(
    @InjectRepository(Routine)
    private routineRepository: Repository<Routine>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(DailyLog)
    private dailyLogRepository: Repository<DailyLog>,
    @InjectRepository(RoutineLog)
    private routineLogRepository: Repository<RoutineLog>,
  ) {}

  private getTodayDate(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
    }).format(new Date());
  }

  private getWeekday(date: string): RecurrenceDay {
    const day = new Date(`${date}T12:00:00-03:00`).getDay();
    return [
      RecurrenceDay.SUNDAY,
      RecurrenceDay.MONDAY,
      RecurrenceDay.TUESDAY,
      RecurrenceDay.WEDNESDAY,
      RecurrenceDay.THURSDAY,
      RecurrenceDay.FRIDAY,
      RecurrenceDay.SATURDAY,
    ][day];
  }

  private isScheduledForDate(routine: Routine, date: string) {
    const recurrenceDays = routine.recurrenceDays ?? [];
    return (
      recurrenceDays.length === 0 ||
      recurrenceDays.includes(this.getWeekday(date))
    );
  }

  private visibleRoutineWhere(id: string, childId: string, familyId: string) {
    return [
      { id, familyId, childId },
      { id, familyId, childId: IsNull() },
    ];
  }

  private visibleRoutinesWhere(childId: string, familyId: string) {
    return [
      { active: true, familyId, childId },
      { active: true, familyId, childId: IsNull() },
    ];
  }

  async findAll(
    userId: string,
    familyId: string,
    options: { todayOnly?: boolean } = {},
  ) {
    const routines = await this.routineRepository.find({
      where: this.visibleRoutinesWhere(userId, familyId),
      relations: ['tasks'],
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    const today = this.getTodayDate();
    const visibleRoutines = options.todayOnly
      ? routines.filter((routine) => this.isScheduledForDate(routine, today))
      : routines;

    // Buscar logs de rotinas de hoje para o usuário
    const todayRoutineLogs = await this.routineLogRepository.find({
      where: { userId, date: today },
    });

    const completedRoutineIds = new Set(
      todayRoutineLogs.filter((log) => log.completed).map((log) => log.routineId),
    );

    // Buscar logs de tarefas de hoje para o usuário
    const todayLogs = await this.dailyLogRepository.find({
      where: { userId, date: today },
    });

    const completedTaskIds = new Set(
      todayLogs
        .filter((log) => log.status !== TaskExecutionStatus.PENDING)
        .map((log) => log.taskId),
    );

    // Adicionar status de completado em cada rotina e suas tarefas
    return visibleRoutines.map((routine) => ({
      ...routine,
      completedToday: completedRoutineIds.has(routine.id),
      tasks: routine.tasks.map((task) => ({
        ...task,
        completedToday: completedTaskIds.has(task.id),
      })),
      completedTasks: routine.tasks.filter((task) =>
        completedTaskIds.has(task.id),
      ).length,
      totalTasks: routine.tasks.length,
    }));
  }

  async findOne(id: string, userId: string, familyId: string) {
    const routine = await this.routineRepository.findOne({
      where: this.visibleRoutineWhere(id, userId, familyId),
      relations: ['tasks'],
    });

    if (!routine) {
      throw new NotFoundException('Rotina não encontrada');
    }

    const today = this.getTodayDate();

    const todayLogs = await this.dailyLogRepository.find({
      where: { userId, date: today },
    });

    const completedTaskIds = new Set(
      todayLogs
        .filter((log) => log.status !== TaskExecutionStatus.PENDING)
        .map((log) => log.taskId),
    );

    return {
      ...routine,
      tasks: routine.tasks.map((task) => ({
        ...task,
        completedToday: completedTaskIds.has(task.id),
      })),
      completedTasks: routine.tasks.filter((task) =>
        completedTaskIds.has(task.id),
      ).length,
      totalTasks: routine.tasks.length,
    };
  }

  async create(createRoutineDto: CreateRoutineDto, familyId: string) {
    const { taskIds, name, recurrenceDays, ...routineData } = createRoutineDto;

    const routine = this.routineRepository.create({
      ...routineData,
      familyId,
      name: name.trim(),
      recurrenceDays: recurrenceDays ?? [],
    });

    if (taskIds && taskIds.length > 0) {
      const tasks = await this.taskRepository.find({
        where: { id: In(taskIds), familyId },
      });
      routine.tasks = tasks;
    }

    return this.routineRepository.save(routine);
  }

  async update(id: string, updateRoutineDto: UpdateRoutineDto, familyId: string) {
    const routine = await this.routineRepository.findOne({
      where: { id, familyId },
      relations: ['tasks'],
    });

    if (!routine) {
      throw new NotFoundException('Rotina não encontrada');
    }

    const { taskIds, ...routineData } = updateRoutineDto;

    Object.assign(routine, routineData);
    if (updateRoutineDto.name !== undefined) {
      routine.name = updateRoutineDto.name.trim();
    }

    if (taskIds !== undefined) {
      if (taskIds.length > 0) {
        const tasks = await this.taskRepository.find({
          where: { id: In(taskIds), familyId },
        });
        routine.tasks = tasks;
      } else {
        routine.tasks = [];
      }
    }

    return this.routineRepository.save(routine);
  }

  async delete(id: string, familyId: string) {
    const routine = await this.routineRepository.findOne({
      where: { id, familyId },
    });

    if (!routine) {
      throw new NotFoundException('Rotina não encontrada');
    }

    await this.routineRepository.remove(routine);
    return { message: 'Rotina removida com sucesso' };
  }

  async addTask(routineId: string, taskId: string, familyId: string) {
    const routine = await this.routineRepository.findOne({
      where: { id: routineId, familyId },
      relations: ['tasks'],
    });

    if (!routine) {
      throw new NotFoundException('Rotina não encontrada');
    }

    const task = await this.taskRepository.findOne({
      where: { id: taskId, familyId },
    });

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    const taskExists = routine.tasks.some((t) => t.id === taskId);
    if (!taskExists) {
      routine.tasks.push(task);
      await this.routineRepository.save(routine);
    }

    return routine;
  }

  async removeTask(routineId: string, taskId: string, familyId: string) {
    const routine = await this.routineRepository.findOne({
      where: { id: routineId, familyId },
      relations: ['tasks'],
    });

    if (!routine) {
      throw new NotFoundException('Rotina não encontrada');
    }

    routine.tasks = routine.tasks.filter((t) => t.id !== taskId);
    await this.routineRepository.save(routine);

    return routine;
  }

  async complete(routineId: string, userId: string, familyId: string) {
    const routine = await this.routineRepository.findOne({
      where: this.visibleRoutineWhere(routineId, userId, familyId),
    });

    if (!routine) {
      throw new NotFoundException('Rotina não encontrada');
    }

    const today = this.getTodayDate();
    if (!this.isScheduledForDate(routine, today)) {
      throw new BadRequestException('Rotina não está agendada para hoje');
    }

    // Verificar se já existe um log para hoje
    let log = await this.routineLogRepository.findOne({
      where: { userId, routineId, date: today },
    });

    if (log) {
      // Atualizar o log existente
      log.completed = true;
      log.completedAt = new Date();
    } else {
      // Criar novo log
      log = this.routineLogRepository.create({
        userId,
        routineId,
        date: today,
        completed: true,
        completedAt: new Date(),
      });
    }

    await this.routineLogRepository.save(log);

    return {
      ...routine,
      completedToday: true,
    };
  }

  async uncomplete(routineId: string, userId: string, familyId: string) {
    const routine = await this.routineRepository.findOne({
      where: this.visibleRoutineWhere(routineId, userId, familyId),
    });

    if (!routine) {
      throw new NotFoundException('Rotina não encontrada');
    }

    const today = this.getTodayDate();
    if (!this.isScheduledForDate(routine, today)) {
      throw new BadRequestException('Rotina não está agendada para hoje');
    }

    // Buscar o log de hoje
    const log = await this.routineLogRepository.findOne({
      where: { userId, routineId, date: today },
    });

    if (log) {
      log.completed = false;
      log.completedAt = null;
      await this.routineLogRepository.save(log);
    }

    return {
      ...routine,
      completedToday: false,
    };
  }

  async getTodayProgress(userId: string, familyId: string) {
    const today = this.getTodayDate();

    const routines = await this.routineRepository.find({
      where: this.visibleRoutinesWhere(userId, familyId),
    });
    const todayRoutines = routines.filter((routine) =>
      this.isScheduledForDate(routine, today),
    );
    const todayRoutineIds = new Set(
      todayRoutines.map((routine) => routine.id),
    );

    const todayLogs = await this.routineLogRepository.find({
      where: { userId, date: today },
    });

    const completedRoutineIds = new Set(
      todayLogs
        .filter((log) => log.completed && todayRoutineIds.has(log.routineId))
        .map((log) => log.routineId),
    );

    return {
      total: todayRoutines.length,
      completed: completedRoutineIds.size,
      completedIds: Array.from(completedRoutineIds),
    };
  }
}

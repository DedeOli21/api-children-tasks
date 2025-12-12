import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Routine } from '../entities/routine.entity';
import { Task, DailyLog, RoutineLog } from '../entities';
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
    return new Date().toISOString().split('T')[0];
  }

  async findAll(userId: string) {
    const routines = await this.routineRepository.find({
      where: { active: true },
      relations: ['tasks'],
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    const today = this.getTodayDate();

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
      todayLogs.filter((log) => log.completed).map((log) => log.taskId),
    );

    // Adicionar status de completado em cada rotina e suas tarefas
    return routines.map((routine) => ({
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

  async findOne(id: string, userId: string) {
    const routine = await this.routineRepository.findOne({
      where: { id },
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
      todayLogs.filter((log) => log.completed).map((log) => log.taskId),
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

  async create(createRoutineDto: CreateRoutineDto) {
    const { taskIds, ...routineData } = createRoutineDto;

    const routine = this.routineRepository.create(routineData);

    if (taskIds && taskIds.length > 0) {
      const tasks = await this.taskRepository.find({
        where: { id: In(taskIds) },
      });
      routine.tasks = tasks;
    }

    return this.routineRepository.save(routine);
  }

  async update(id: string, updateRoutineDto: UpdateRoutineDto) {
    const routine = await this.routineRepository.findOne({
      where: { id },
      relations: ['tasks'],
    });

    if (!routine) {
      throw new NotFoundException('Rotina não encontrada');
    }

    const { taskIds, ...routineData } = updateRoutineDto;

    Object.assign(routine, routineData);

    if (taskIds !== undefined) {
      if (taskIds.length > 0) {
        const tasks = await this.taskRepository.find({
          where: { id: In(taskIds) },
        });
        routine.tasks = tasks;
      } else {
        routine.tasks = [];
      }
    }

    return this.routineRepository.save(routine);
  }

  async delete(id: string) {
    const routine = await this.routineRepository.findOne({ where: { id } });

    if (!routine) {
      throw new NotFoundException('Rotina não encontrada');
    }

    await this.routineRepository.remove(routine);
    return { message: 'Rotina removida com sucesso' };
  }

  async addTask(routineId: string, taskId: string) {
    const routine = await this.routineRepository.findOne({
      where: { id: routineId },
      relations: ['tasks'],
    });

    if (!routine) {
      throw new NotFoundException('Rotina não encontrada');
    }

    const task = await this.taskRepository.findOne({ where: { id: taskId } });

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

  async removeTask(routineId: string, taskId: string) {
    const routine = await this.routineRepository.findOne({
      where: { id: routineId },
      relations: ['tasks'],
    });

    if (!routine) {
      throw new NotFoundException('Rotina não encontrada');
    }

    routine.tasks = routine.tasks.filter((t) => t.id !== taskId);
    await this.routineRepository.save(routine);

    return routine;
  }

  async complete(routineId: string, userId: string) {
    const routine = await this.routineRepository.findOne({
      where: { id: routineId },
    });

    if (!routine) {
      throw new NotFoundException('Rotina não encontrada');
    }

    const today = this.getTodayDate();

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

  async uncomplete(routineId: string, userId: string) {
    const routine = await this.routineRepository.findOne({
      where: { id: routineId },
    });

    if (!routine) {
      throw new NotFoundException('Rotina não encontrada');
    }

    const today = this.getTodayDate();

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

  async getTodayProgress(userId: string) {
    const today = this.getTodayDate();

    const routines = await this.routineRepository.find({
      where: { active: true },
    });

    const todayLogs = await this.routineLogRepository.find({
      where: { userId, date: today },
    });

    const completedRoutineIds = new Set(
      todayLogs.filter((log) => log.completed).map((log) => log.routineId),
    );

    return {
      total: routines.length,
      completed: completedRoutineIds.size,
      completedIds: Array.from(completedRoutineIds),
    };
  }
}


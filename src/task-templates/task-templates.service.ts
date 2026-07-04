import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RecurrenceDay,
  TaskTemplate,
  TaskType,
  User,
} from '../entities';
import { AccessControlService } from '../auth/access-control.service';
import { TaskSchedulerService } from '../task-scheduler/task-scheduler.service';
import { CreateTaskTemplateDto } from './dto/create-task-template.dto';
import { UpdateTaskTemplateDto } from './dto/update-task-template.dto';

@Injectable()
export class TaskTemplatesService {
  constructor(
    @InjectRepository(TaskTemplate)
    private templateRepository: Repository<TaskTemplate>,
    private accessControl: AccessControlService,
    private scheduler: TaskSchedulerService,
  ) {}

  private toPublic(template: TaskTemplate) {
    return {
      id: template.id,
      familyId: template.familyId,
      childId: template.childId,
      title: template.title,
      emoji: template.emoji,
      rewardStars: template.rewardStars,
      taskType: template.taskType,
      recurrenceDays: template.recurrenceDays,
      scheduledDate: template.scheduledDate,
      active: template.active,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  async create(parent: User, dto: CreateTaskTemplateDto) {
    const child = await this.accessControl.resolveChild(parent, dto.childId);
    const normalized = this.normalize({
      taskType: dto.taskType ?? TaskType.FIXED,
      recurrenceDays: dto.recurrenceDays ?? [],
      scheduledDate: dto.scheduledDate ?? null,
    });

    const template = await this.templateRepository.save(
      this.templateRepository.create({
        familyId: parent.id,
        childId: child.id,
        title: dto.title.trim(),
        emoji: dto.emoji ?? '⭐',
        rewardStars: dto.rewardStars ?? 1,
        taskType: normalized.taskType,
        recurrenceDays: normalized.recurrenceDays,
        scheduledDate: normalized.scheduledDate,
        active: true,
      }),
    );

    await this.instantiateIfDue(template);
    return this.toPublic(template);
  }

  async findAll(parent: User, childId?: string) {
    const where: { familyId: string; childId?: string; active: boolean } = {
      familyId: parent.id,
      active: true,
    };
    if (childId) {
      const child = await this.accessControl.resolveChild(parent, childId);
      where.childId = child.id;
    }

    const templates = await this.templateRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
    return templates.map((template) => this.toPublic(template));
  }

  async findOne(parent: User, id: string) {
    return this.toPublic(await this.getOwned(parent.id, id));
  }

  async update(parent: User, id: string, dto: UpdateTaskTemplateDto) {
    const template = await this.getOwned(parent.id, id);
    const normalized = this.normalize({
      taskType: dto.taskType ?? template.taskType,
      recurrenceDays: dto.recurrenceDays ?? template.recurrenceDays,
      scheduledDate:
        dto.scheduledDate !== undefined
          ? dto.scheduledDate
          : template.scheduledDate,
    });

    if (dto.title !== undefined) template.title = dto.title.trim();
    if (dto.emoji !== undefined) template.emoji = dto.emoji;
    if (dto.rewardStars !== undefined) template.rewardStars = dto.rewardStars;
    if (dto.active !== undefined) template.active = dto.active;
    template.taskType = normalized.taskType;
    template.recurrenceDays = normalized.recurrenceDays;
    template.scheduledDate = normalized.scheduledDate;

    const saved = await this.templateRepository.save(template);
    await this.instantiateIfDue(saved);
    return this.toPublic(saved);
  }

  async remove(parent: User, id: string) {
    const template = await this.getOwned(parent.id, id);
    template.active = false;
    await this.templateRepository.save(template);
    return { message: 'Template de tarefa removido com sucesso' };
  }

  private normalize(config: {
    taskType: TaskType;
    recurrenceDays: RecurrenceDay[];
    scheduledDate: string | null;
  }) {
    if (config.taskType === TaskType.FIXED) {
      if (config.recurrenceDays.length === 0) {
        throw new BadRequestException(
          'Hábitos recorrentes precisam de pelo menos um dia da semana',
        );
      }
      return {
        taskType: TaskType.FIXED,
        recurrenceDays: Array.from(new Set(config.recurrenceDays)),
        scheduledDate: null,
      };
    }

    if (!config.scheduledDate) {
      throw new BadRequestException(
        'Missões extras precisam de uma data agendada',
      );
    }
    return {
      taskType: TaskType.EXTRA,
      recurrenceDays: [],
      scheduledDate: config.scheduledDate,
    };
  }

  private async instantiateIfDue(template: TaskTemplate) {
    if (!template.active) return;

    const today = this.getDateInTimeZone(new Date(), 'America/Sao_Paulo');
    if (
      template.taskType === TaskType.EXTRA &&
      template.scheduledDate === today
    ) {
      await this.scheduler.instantiateTasksForDate(today);
      return;
    }

    const weekday = this.getWeekday(today);
    if (
      template.taskType === TaskType.FIXED &&
      template.recurrenceDays.includes(weekday)
    ) {
      await this.scheduler.instantiateTasksForDate(today, weekday);
    }
  }

  private getDateInTimeZone(date: Date, timeZone: string) {
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
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

  private async getOwned(familyId: string, id: string) {
    const template = await this.templateRepository.findOne({
      where: { id, familyId, active: true },
    });
    if (!template) {
      throw new NotFoundException('Template de tarefa não encontrado');
    }
    return template;
  }
}

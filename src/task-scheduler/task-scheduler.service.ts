import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource, EntityManager, In } from 'typeorm';
import {
  ActiveTask,
  ActiveTaskStatus,
  RecurrenceDay,
  TaskTemplate,
  TaskType,
} from '../entities';

@Injectable()
export class TaskSchedulerService {
  private readonly logger = new Logger(TaskSchedulerService.name);

  constructor(private readonly dataSource: DataSource) {}

  @Cron('0 0 * * *', { timeZone: 'America/Sao_Paulo' })
  async instantiateTodayTasks() {
    const date = this.getDateInTimeZone(new Date(), 'America/Sao_Paulo');
    const weekday = this.getWeekday(date);
    const created = await this.instantiateTasksForDate(date, weekday);

    this.logger.log(`Tarefas ativas geradas para ${date}: ${created}`);
  }

  async instantiateTasksForDate(
    date: string,
    weekday = this.getWeekday(date),
  ): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      const templates = await this.findTemplatesForDate(manager, date, weekday);
      if (templates.length === 0) return 0;
      const templateIds = templates.map((template) => template.id);
      const existingCount = await manager.count(ActiveTask, {
        where: { date, templateId: In(templateIds) },
      });

      const rows = templates.map((template) =>
        manager.create(ActiveTask, {
          templateId: template.id,
          familyId: template.familyId,
          childId: template.childId,
          date,
          title: template.title,
          emoji: template.emoji,
          rewardStars: template.rewardStars,
          status: ActiveTaskStatus.PENDING,
        }),
      );

      await manager
        .createQueryBuilder()
        .insert()
        .into(ActiveTask)
        .values(rows)
        .orIgnore()
        .execute();

      const finalCount = await manager.count(ActiveTask, {
        where: { date, templateId: In(templateIds) },
      });
      return finalCount - existingCount;
    });
  }

  private async findTemplatesForDate(
    manager: EntityManager,
    date: string,
    weekday: RecurrenceDay,
  ): Promise<TaskTemplate[]> {
    if (this.dataSource.options.type === 'postgres') {
      return manager
        .getRepository(TaskTemplate)
        .createQueryBuilder('template')
        .where('template.active = true')
        .andWhere(
          `(
            template.taskType = :fixedType
            AND :weekday = ANY(template.recurrenceDays)
          ) OR (
            template.taskType = :extraType
            AND template.scheduledDate = :date
          )`,
          {
            fixedType: TaskType.FIXED,
            extraType: TaskType.EXTRA,
            weekday,
            date,
          },
        )
        .getMany();
    }

    const templates = await manager.find(TaskTemplate, {
      where: { active: true },
    });
    return templates.filter((template) => {
      if (template.taskType === TaskType.EXTRA) {
        return template.scheduledDate === date;
      }
      return (
        template.taskType === TaskType.FIXED &&
        template.recurrenceDays.includes(weekday)
      );
    });
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
}

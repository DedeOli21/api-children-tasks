import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RoutineTemplate,
  RoutineTemplateTask,
  Task,
  DailyLog,
  TaskExecutionStatus,
  User,
} from '../entities';
import { AccessControlService } from '../auth/access-control.service';
import { CreateTemplateDto, TemplateTaskDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { InstantiateTemplateDto } from './dto/instantiate-template.dto';

@Injectable()
export class RoutineTemplatesService {
  constructor(
    @InjectRepository(RoutineTemplate)
    private templateRepository: Repository<RoutineTemplate>,
    @InjectRepository(RoutineTemplateTask)
    private templateTaskRepository: Repository<RoutineTemplateTask>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(DailyLog)
    private dailyLogRepository: Repository<DailyLog>,
    private accessControl: AccessControlService,
  ) {}

  private buildTasks(items: TemplateTaskDto[]): RoutineTemplateTask[] {
    return items.map((item, index) =>
      this.templateTaskRepository.create({
        title: item.title,
        iconEmoji: item.iconEmoji ?? '⭐',
        scheduledTime: item.scheduledTime ?? null,
        timeOfDay: item.timeOfDay ?? null,
        sortOrder: item.sortOrder ?? index,
      }),
    );
  }

  private toPublic(template: RoutineTemplate) {
    return {
      id: template.id,
      name: template.name,
      emoji: template.emoji,
      description: template.description,
      tasks: (template.tasks ?? [])
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((task) => ({
          id: task.id,
          title: task.title,
          iconEmoji: task.iconEmoji,
          scheduledTime: task.scheduledTime,
          timeOfDay: task.timeOfDay,
          sortOrder: task.sortOrder,
        })),
      createdAt: template.createdAt,
    };
  }

  async create(familyId: string, dto: CreateTemplateDto) {
    const template = this.templateRepository.create({
      familyId,
      name: dto.name,
      emoji: dto.emoji ?? '🗓️',
      description: dto.description ?? null,
      tasks: this.buildTasks(dto.tasks),
    });
    await this.templateRepository.save(template);
    return this.toPublic(template);
  }

  async findAll(familyId: string) {
    const templates = await this.templateRepository.find({
      where: { familyId },
      relations: ['tasks'],
      order: { createdAt: 'ASC' },
    });
    return templates.map((template) => this.toPublic(template));
  }

  async findOne(familyId: string, id: string) {
    const template = await this.getOwned(familyId, id);
    return this.toPublic(template);
  }

  async update(familyId: string, id: string, dto: UpdateTemplateDto) {
    const template = await this.getOwned(familyId, id);

    if (dto.name) template.name = dto.name;
    if (dto.emoji) template.emoji = dto.emoji;
    if (dto.description !== undefined) template.description = dto.description;

    if (dto.tasks) {
      // Substitui a lista: remove itens antigos e recria
      await this.templateTaskRepository.delete({ templateId: template.id });
      template.tasks = this.buildTasks(dto.tasks);
    }

    await this.templateRepository.save(template);
    return this.toPublic(template);
  }

  async remove(familyId: string, id: string) {
    const template = await this.getOwned(familyId, id);
    await this.templateRepository.remove(template);
    return { message: 'Template removido com sucesso' };
  }

  /**
   * Materializa o template para uma criança em um dia:
   * - Reutiliza tarefas do catálogo da família com o mesmo título
   *   (não duplica o catálogo a cada instanciação) ou cria as que faltam.
   * - Garante um DailyLog PENDING para cada tarefa naquele dia,
   *   colocando-as no cronograma da criança.
   */
  async instantiate(parent: User, id: string, dto: InstantiateTemplateDto) {
    const template = await this.getOwned(parent.id, id);
    const child = await this.accessControl.resolveChild(parent, dto.childId);
    const date = dto.date ?? new Date().toISOString().split('T')[0];

    let tasksCreated = 0;
    let logsCreated = 0;
    const taskIds: string[] = [];

    for (const item of template.tasks.sort((a, b) => a.sortOrder - b.sortOrder)) {
      let task = await this.taskRepository.findOne({
        where: { familyId: parent.id, title: item.title, active: true },
      });
      if (!task) {
        task = await this.taskRepository.save(
          this.taskRepository.create({
            familyId: parent.id,
            title: item.title,
            iconEmoji: item.iconEmoji,
          }),
        );
        tasksCreated++;
      }
      taskIds.push(task.id);

      const existingLog = await this.dailyLogRepository.findOne({
        where: { userId: child.id, taskId: task.id, date },
      });
      if (!existingLog) {
        await this.dailyLogRepository.save(
          this.dailyLogRepository.create({
            userId: child.id,
            taskId: task.id,
            date,
            completed: false,
            status: TaskExecutionStatus.PENDING,
          }),
        );
        logsCreated++;
      }
    }

    return {
      template: { id: template.id, name: template.name },
      childId: child.id,
      date,
      taskIds,
      tasksCreated,
      scheduled: logsCreated,
      message: `Rotina "${template.name}" aplicada para ${child.name} em ${date}`,
    };
  }

  private async getOwned(familyId: string, id: string): Promise<RoutineTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id, familyId },
      relations: ['tasks'],
    });
    if (!template) {
      throw new NotFoundException('Template não encontrado');
    }
    return template;
  }
}

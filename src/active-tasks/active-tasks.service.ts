import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  ActiveTask,
  ActiveTaskStatus,
  HistoryEntry,
  HistoryType,
  PetDropSourceType,
  User,
  UserRole,
} from '../entities';
import { AccessControlService } from '../auth/access-control.service';
import { EventsService } from '../events/events.service';
import {
  PetRewardResult,
  PetRewardsService,
} from '../pet-rewards/pet-rewards.service';
import { StreaksService } from '../streaks/streaks.service';

@Injectable()
export class ActiveTasksService {
  constructor(
    @InjectRepository(ActiveTask)
    private activeTaskRepository: Repository<ActiveTask>,
    private accessControl: AccessControlService,
    private eventsService: EventsService,
    private petRewardsService: PetRewardsService,
    private streaksService: StreaksService,
    private dataSource: DataSource,
  ) {}

  private toPublic(task: ActiveTask) {
    return {
      id: task.id,
      templateId: task.templateId,
      familyId: task.familyId,
      childId: task.childId,
      childName: task.child?.name,
      date: task.date,
      title: task.title,
      emoji: task.emoji,
      rewardStars: task.rewardStars,
      status: task.status,
      completedAt: task.completedAt,
      approvedAt: task.approvedAt,
      createdAt: task.createdAt,
    };
  }

  async forDay(actor: User, childId: string | undefined, date: string) {
    const child = await this.accessControl.resolveChild(actor, childId);
    const tasks = await this.activeTaskRepository.find({
      where: { childId: child.id, date },
      relations: ['child'],
      order: { createdAt: 'ASC' },
    });
    return tasks.map((task) => this.toPublic(task));
  }

  async pendingApproval(parent: User, childId?: string) {
    if (childId) {
      await this.accessControl.resolveChild(parent, childId);
    }
    const tasks = await this.activeTaskRepository.find({
      where: {
        familyId: parent.id,
        ...(childId ? { childId } : {}),
        status: ActiveTaskStatus.COMPLETED,
      },
      relations: ['child'],
      order: { completedAt: 'ASC' },
      take: 100,
    });
    return tasks.map((task) => this.toPublic(task));
  }

  async complete(actor: User, id: string) {
    const task = await this.getTaskForActor(actor, id);
    if (task.status === ActiveTaskStatus.APPROVED) {
      throw new BadRequestException('Tarefa já foi aprovada');
    }

    task.status = ActiveTaskStatus.COMPLETED;
    task.completedAt = new Date();
    const saved = await this.activeTaskRepository.save(task);
    const streakInfo = await this.streaksService.updateStreak(task.childId);
    return {
      ...this.toPublic(saved),
      streak: streakInfo.streak,
      message: `Tarefa "${task.title}" enviada para aprovação!`,
    };
  }

  async uncomplete(actor: User, id: string) {
    const task = await this.getTaskForActor(actor, id);
    if (task.status === ActiveTaskStatus.APPROVED) {
      throw new BadRequestException(
        'Tarefa aprovada não pode voltar para pendente',
      );
    }

    task.status = ActiveTaskStatus.PENDING;
    task.completedAt = null;
    const saved = await this.activeTaskRepository.save(task);
    return this.toPublic(saved);
  }

  async approve(parent: User, id: string) {
    const task = await this.activeTaskRepository.findOne({
      where: { id },
      relations: ['child'],
    });
    if (!task) {
      throw new NotFoundException('Tarefa do dia não encontrada');
    }
    if (task.familyId !== parent.id) {
      throw new ForbiddenException('Essa tarefa não pertence à sua família');
    }
    if (task.status === ActiveTaskStatus.APPROVED) {
      throw new BadRequestException('Tarefa já foi aprovada');
    }
    if (task.status !== ActiveTaskStatus.COMPLETED) {
      throw new BadRequestException('A criança ainda não concluiu esta tarefa');
    }

    const { multiplier: eventMultiplier, event } =
      await this.eventsService.activeMultiplier(parent.id);
    const starsToAdd = task.rewardStars * eventMultiplier;

    let petReward: PetRewardResult | null = null;
    const currentStars = await this.dataSource.transaction(async (manager) => {
      task.status = ActiveTaskStatus.APPROVED;
      task.approvedAt = new Date();
      task.approvedById = parent.id;
      await manager.save(task);

      const child = await manager.findOne(User, {
        where: { id: task.childId },
      });
      if (!child) {
        throw new NotFoundException('Criança não encontrada');
      }
      child.currentStars += starsToAdd;
      await manager.save(child);

      await manager.save(
        manager.create(HistoryEntry, {
          userId: child.id,
          type: HistoryType.TASK_COMPLETE,
          description: event
            ? `Tarefa aprovada: ${task.title} ${event.emoji} ${event.name}`
            : `Tarefa aprovada: ${task.title}`,
          starsChange: starsToAdd,
        }),
      );

      petReward = await this.petRewardsService.awardForCompletion(manager, {
        familyId: parent.id,
        child,
        sourceType: PetDropSourceType.DAILY_TASK,
        sourceId: task.id,
      });

      return child.currentStars;
    });

    return {
      ...this.toPublic(task),
      currentStars,
      starsEarned: starsToAdd,
      eventMultiplier,
      petReward,
      message: `Tarefa "${task.title}" aprovada! +${starsToAdd} estrela(s)`,
    };
  }

  private async getTaskForActor(actor: User, id: string) {
    const task = await this.activeTaskRepository.findOne({
      where: { id },
      relations: ['child'],
    });
    if (!task) {
      throw new NotFoundException('Tarefa do dia não encontrada');
    }

    if (actor.role === UserRole.PARENT && task.familyId !== actor.id) {
      throw new ForbiddenException('Essa tarefa não pertence à sua família');
    }
    await this.accessControl.resolveChild(actor, task.childId);
    return task;
  }
}

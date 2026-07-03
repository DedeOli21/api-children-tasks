import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  Mission,
  MissionStatus,
  User,
  UserRole,
  HistoryEntry,
  HistoryType,
} from '../entities';
import { NotificationType } from '../entities';
import { AccessControlService } from '../auth/access-control.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsService } from '../events/events.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { AllocateMissionDto } from './dto/allocate-mission.dto';

@Injectable()
export class MissionsService {
  constructor(
    @InjectRepository(Mission)
    private missionRepository: Repository<Mission>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(HistoryEntry)
    private historyRepository: Repository<HistoryEntry>,
    private accessControl: AccessControlService,
    private notificationsService: NotificationsService,
    private eventsService: EventsService,
    private dataSource: DataSource,
  ) {}

  private toPublic(mission: Mission) {
    return {
      id: mission.id,
      title: mission.title,
      description: mission.description,
      iconEmoji: mission.iconEmoji,
      status: mission.status,
      scheduledDate: mission.scheduledDate,
      starsReward: mission.starsReward,
      childId: mission.assignedToId,
      childName: mission.assignedTo?.name,
      teacherName: mission.createdBy?.name,
      completedAt: mission.completedAt,
      approvedAt: mission.approvedAt,
      createdAt: mission.createdAt,
    };
  }

  // ============ PROFESSOR ============

  // Cria uma missão por criança selecionada (turma = vários childIds)
  async create(teacher: User, dto: CreateMissionDto) {
    const missions: Mission[] = [];
    for (const childId of dto.childIds) {
      const child = await this.accessControl.resolveChild(teacher, childId);
      missions.push(
        this.missionRepository.create({
          title: dto.title,
          description: dto.description ?? null,
          iconEmoji: dto.iconEmoji ?? '📚',
          starsReward: dto.starsReward ?? 1,
          createdById: teacher.id,
          assignedToId: child.id,
          status: MissionStatus.INBOX,
        }),
      );
    }
    const saved = await this.missionRepository.save(missions);

    // Avisa cada responsável (dedupe: 1 aviso por professor/dia por família)
    const today = new Date().toISOString().split('T')[0];
    const parentIds = new Set<string>();
    for (const childId of dto.childIds) {
      const child = await this.userRepository.findOne({ where: { id: childId } });
      if (child?.parentId) parentIds.add(child.parentId);
    }
    for (const parentId of parentIds) {
      await this.notificationsService.notify(
        parentId,
        NotificationType.APPROVAL_PENDING,
        '🚀 Nova missão da escola na sua inbox!',
        `${teacher.name} enviou "${dto.title}" — aloque em um dia da semana.`,
        `mission-inbox:${teacher.id}:${parentId}:${today}`,
      );
    }

    return saved.map((mission) => ({
      id: mission.id,
      title: mission.title,
      childId: mission.assignedToId,
      status: mission.status,
    }));
  }

  // Missões que o professor enviou, com o estado atual de cada uma
  async listForTeacher(teacher: User) {
    const missions = await this.missionRepository.find({
      where: { createdById: teacher.id },
      relations: ['assignedTo'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return missions.map((mission) => this.toPublic(mission));
  }

  // ============ RESPONSÁVEL ============

  // Caixa de entrada: missões dos meus filhos ainda não alocadas
  async inbox(parent: User) {
    const children = await this.userRepository.find({
      where: { role: UserRole.CHILD, parentId: parent.id },
      select: ['id'],
    });
    if (children.length === 0) return [];

    const missions = await this.missionRepository.find({
      where: {
        assignedToId: In(children.map((c) => c.id)),
        status: MissionStatus.INBOX,
      },
      relations: ['assignedTo', 'createdBy'],
      order: { createdAt: 'ASC' },
    });
    return missions.map((mission) => this.toPublic(mission));
  }

  // Move a missão da inbox para um dia do cronograma da criança
  async allocate(parent: User, missionId: string, dto: AllocateMissionDto) {
    const mission = await this.getMissionForParent(parent, missionId);

    if (
      mission.status !== MissionStatus.INBOX &&
      mission.status !== MissionStatus.SCHEDULED
    ) {
      throw new BadRequestException(
        'Missão já foi concluída e não pode ser realocada',
      );
    }

    mission.status = MissionStatus.SCHEDULED;
    mission.scheduledDate = dto.date;
    await this.missionRepository.save(mission);
    return this.toPublic(mission);
  }

  // Devolve a missão para a inbox (desfaz a alocação)
  async backToInbox(parent: User, missionId: string) {
    const mission = await this.getMissionForParent(parent, missionId);

    if (mission.status !== MissionStatus.SCHEDULED) {
      throw new BadRequestException('Apenas missões agendadas podem voltar para a inbox');
    }

    mission.status = MissionStatus.INBOX;
    mission.scheduledDate = null;
    await this.missionRepository.save(mission);
    return this.toPublic(mission);
  }

  // Fila "Aguardando Revisão" das missões
  async pendingApproval(parent: User) {
    const children = await this.userRepository.find({
      where: { role: UserRole.CHILD, parentId: parent.id },
      select: ['id'],
    });
    if (children.length === 0) return [];

    const missions = await this.missionRepository.find({
      where: {
        assignedToId: In(children.map((c) => c.id)),
        status: MissionStatus.COMPLETED,
      },
      relations: ['assignedTo', 'createdBy'],
      order: { completedAt: 'ASC' },
    });
    return missions.map((mission) => this.toPublic(mission));
  }

  // Aprova e credita as estrelas — único ponto que recompensa a missão.
  // Status + crédito + histórico na mesma transação; Evento Surpresa
  // vigente multiplica a recompensa.
  async approve(parent: User, missionId: string) {
    const mission = await this.getMissionForParent(parent, missionId);

    if (mission.status !== MissionStatus.COMPLETED) {
      throw new BadRequestException('A missão ainda não foi concluída pela criança');
    }

    const { multiplier: eventMultiplier, event } =
      await this.eventsService.activeMultiplier(parent.id);
    const starsToAdd = mission.starsReward * eventMultiplier;
    const teacherName = mission.createdBy?.name ?? 'Professor(a)';

    const currentStars = await this.dataSource.transaction(async (manager) => {
      mission.status = MissionStatus.APPROVED;
      mission.approvedAt = new Date();
      await manager.save(mission);

      const child = await manager.findOne(User, {
        where: { id: mission.assignedToId },
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
            ? `Missão aprovada: ${mission.title} (${teacherName}) ${event.emoji} ${event.name}`
            : `Missão aprovada: ${mission.title} (${teacherName})`,
          starsChange: starsToAdd,
        }),
      );

      return child.currentStars;
    });

    return {
      ...this.toPublic(mission),
      currentStars,
      starsEarned: starsToAdd,
      eventMultiplier,
      message: `Missão "${mission.title}" aprovada! +${starsToAdd} estrela(s)`,
    };
  }

  // ============ CRIANÇA / DIA ============

  // Missões do dia (visão da criança ou do responsável/professor com acesso)
  async forDay(actor: User, childId: string | undefined, date: string) {
    const child = await this.accessControl.resolveChild(actor, childId);
    const missions = await this.missionRepository.find({
      where: {
        assignedToId: child.id,
        scheduledDate: date,
        status: In([
          MissionStatus.SCHEDULED,
          MissionStatus.COMPLETED,
          MissionStatus.APPROVED,
        ]),
      },
      relations: ['createdBy'],
      order: { createdAt: 'ASC' },
    });
    return missions.map((mission) => this.toPublic(mission));
  }

  // Criança marca como feita → aguarda aprovação (sem crédito de estrelas)
  async markAsDone(actor: User, missionId: string) {
    const mission = await this.missionRepository.findOne({
      where: { id: missionId },
      relations: ['createdBy'],
    });
    if (!mission) {
      throw new NotFoundException('Missão não encontrada');
    }

    // Criança só conclui a própria missão; responsável pode marcar pelo filho
    await this.accessControl.resolveChild(actor, mission.assignedToId);

    if (mission.status !== MissionStatus.SCHEDULED) {
      throw new BadRequestException(
        mission.status === MissionStatus.INBOX
          ? 'A missão ainda não foi alocada em um dia'
          : 'Missão já concluída',
      );
    }

    mission.status = MissionStatus.COMPLETED;
    mission.completedAt = new Date();
    await this.missionRepository.save(mission);

    return {
      ...this.toPublic(mission),
      message: 'Missão enviada para aprovação! Aguardando o chefe aprovar 😄',
    };
  }

  // ============ REMOÇÃO ============

  async remove(actor: User, missionId: string) {
    const mission = await this.missionRepository.findOne({
      where: { id: missionId },
      relations: ['assignedTo'],
    });
    if (!mission) {
      throw new NotFoundException('Missão não encontrada');
    }

    const isCreator =
      actor.role === UserRole.TEACHER && mission.createdById === actor.id;
    const isGuardian =
      actor.role === UserRole.PARENT &&
      mission.assignedTo?.parentId === actor.id;

    if (!isCreator && !isGuardian) {
      throw new ForbiddenException('Você não pode remover esta missão');
    }
    if (mission.status === MissionStatus.APPROVED) {
      throw new BadRequestException('Missões aprovadas não podem ser removidas');
    }

    await this.missionRepository.remove(mission);
    return { message: 'Missão removida com sucesso' };
  }

  private async getMissionForParent(
    parent: User,
    missionId: string,
  ): Promise<Mission> {
    const mission = await this.missionRepository.findOne({
      where: { id: missionId },
      relations: ['assignedTo', 'createdBy'],
    });
    if (!mission) {
      throw new NotFoundException('Missão não encontrada');
    }
    if (mission.assignedTo?.parentId !== parent.id) {
      throw new ForbiddenException('Essa missão não pertence à sua família');
    }
    return mission;
  }
}

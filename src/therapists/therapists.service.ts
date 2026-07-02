import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  User,
  UserRole,
  TherapistChild,
  HistoryEntry,
  BehaviorReport,
  Observation,
  DailyLog,
  TaskExecutionStatus,
} from '../entities';
import { AccessControlService } from '../auth/access-control.service';
import { CreateTherapistDto } from './dto/create-therapist.dto';

@Injectable()
export class TherapistsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(TherapistChild)
    private therapistChildRepository: Repository<TherapistChild>,
    @InjectRepository(HistoryEntry)
    private historyRepository: Repository<HistoryEntry>,
    @InjectRepository(BehaviorReport)
    private behaviorReportRepository: Repository<BehaviorReport>,
    @InjectRepository(Observation)
    private observationRepository: Repository<Observation>,
    @InjectRepository(DailyLog)
    private dailyLogRepository: Repository<DailyLog>,
    private accessControl: AccessControlService,
  ) {}

  // ============ GESTÃO PELO RESPONSÁVEL ============

  /**
   * Cria (ou reaproveita) a conta da terapeuta e vincula à criança.
   * Se o email já pertence a uma terapeuta (ex: atende outra família),
   * apenas o vínculo é criado — sem tocar na senha existente.
   */
  async createOrLink(parent: User, dto: CreateTherapistDto) {
    const child = await this.accessControl.resolveChild(parent, dto.childId);

    let therapist = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (therapist && therapist.role !== UserRole.THERAPIST) {
      throw new ConflictException('Este email já está em uso por outro tipo de conta');
    }

    if (!therapist) {
      if (!dto.name || !dto.password) {
        throw new BadRequestException(
          'Para criar uma nova conta de terapeuta, informe nome e senha',
        );
      }
      therapist = await this.userRepository.save(
        this.userRepository.create({
          name: dto.name,
          email: dto.email,
          password: await bcrypt.hash(dto.password, 10),
          role: UserRole.THERAPIST,
        }),
      );
    }

    const existingLink = await this.therapistChildRepository.findOne({
      where: { therapistId: therapist.id, childId: child.id },
    });
    if (existingLink) {
      throw new ConflictException('Terapeuta já vinculada a esta criança');
    }

    await this.therapistChildRepository.save(
      this.therapistChildRepository.create({
        therapistId: therapist.id,
        childId: child.id,
        createdById: parent.id,
      }),
    );

    return {
      id: therapist.id,
      name: therapist.name,
      email: therapist.email,
      childId: child.id,
      message: `Terapeuta ${therapist.name} vinculada a ${child.name}`,
    };
  }

  // Terapeutas vinculadas aos filhos do responsável
  async listForParent(parent: User) {
    const children = await this.userRepository.find({
      where: { role: UserRole.CHILD, parentId: parent.id },
      select: ['id', 'name'],
    });
    if (children.length === 0) return [];

    const links = await this.therapistChildRepository.find({
      where: { childId: In(children.map((c) => c.id)) },
      relations: ['therapist'],
      order: { createdAt: 'ASC' },
    });

    const childNameById = new Map(children.map((c) => [c.id, c.name]));
    return links.map((link) => ({
      therapistId: link.therapistId,
      name: link.therapist?.name,
      email: link.therapist?.email,
      childId: link.childId,
      childName: childNameById.get(link.childId),
      linkedAt: link.createdAt,
    }));
  }

  async unlink(parent: User, therapistId: string, childId: string) {
    await this.accessControl.resolveChild(parent, childId);
    const link = await this.therapistChildRepository.findOne({
      where: { therapistId, childId },
    });
    if (!link) {
      throw new NotFoundException('Vínculo não encontrado');
    }
    await this.therapistChildRepository.remove(link);
    return { message: 'Acesso da terapeuta removido' };
  }

  // ============ VISÃO DA TERAPEUTA ============

  async listPatients(therapist: User) {
    const links = await this.therapistChildRepository.find({
      where: { therapistId: therapist.id },
      relations: ['child'],
      order: { createdAt: 'ASC' },
    });
    return links
      .filter((link) => link.child)
      .map((link) => ({
        id: link.child.id,
        name: link.child.name,
        currentStars: link.child.currentStars,
        currentStreak: link.child.currentStreak,
        longestStreak: link.child.longestStreak,
      }));
  }

  /**
   * Timeline diária consolidada (casa + escola) para a terapeuta:
   * histórico de estrelas, relatórios do professor e observações.
   */
  async timeline(actor: User, childId: string, days = 14) {
    const child = await this.accessControl.resolveChild(actor, childId);

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);
    const sinceDate = since.toISOString().split('T')[0];

    const [history, reports, observations] = await Promise.all([
      this.historyRepository.find({
        where: { userId: child.id, createdAt: Between(since, new Date()) },
        order: { createdAt: 'DESC' },
        take: 200,
      }),
      this.behaviorReportRepository
        .createQueryBuilder('report')
        .leftJoinAndSelect('report.teacher', 'teacher')
        .where('report.child_id = :childId', { childId: child.id })
        .andWhere('report.date >= :sinceDate', { sinceDate })
        .orderBy('report.date', 'DESC')
        .getMany(),
      this.observationRepository
        .createQueryBuilder('observation')
        .leftJoinAndSelect('observation.author', 'author')
        .where('observation.child_id = :childId', { childId: child.id })
        .andWhere('observation.date >= :sinceDate', { sinceDate })
        .orderBy('observation.created_at', 'DESC')
        .getMany(),
    ]);

    // Eventos unificados e ordenados do mais recente para o mais antigo
    const events = [
      ...history.map((entry) => ({
        kind: 'history' as const,
        at: entry.createdAt,
        type: entry.type,
        description: entry.description,
        starsChange: entry.starsChange,
      })),
      ...reports.map((report) => ({
        kind: 'school_report' as const,
        at: report.createdAt,
        date: report.date,
        rating: report.rating,
        text: report.text,
        starsAwarded: report.starsAwarded,
        authorName: report.teacher?.name,
      })),
      ...observations.map((observation) => ({
        kind: 'observation' as const,
        at: observation.createdAt,
        date: observation.date,
        type: observation.type,
        text: observation.text,
        authorName: observation.author?.name,
        authorRole: observation.authorRole,
      })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return {
      child: {
        id: child.id,
        name: child.name,
        currentStars: child.currentStars,
        currentStreak: child.currentStreak,
        longestStreak: child.longestStreak,
      },
      since: sinceDate,
      events,
    };
  }

  // Dados comportamentais agregados para o dashboard da terapeuta
  async analytics(actor: User, childId: string, days = 30) {
    const child = await this.accessControl.resolveChild(actor, childId);

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);
    const sinceDate = since.toISOString().split('T')[0];

    const [history, logs] = await Promise.all([
      this.historyRepository.find({
        where: { userId: child.id, createdAt: Between(since, new Date()) },
      }),
      this.dailyLogRepository
        .createQueryBuilder('log')
        .where('log.user_id = :childId', { childId: child.id })
        .andWhere('log.date >= :sinceDate', { sinceDate })
        .getMany(),
    ]);

    // Conclusão de tarefas por dia (esforço) e penalidades por dia (comportamento)
    const byDay: Record<string, { completed: number; approved: number; penalties: number }> = {};
    for (const log of logs) {
      byDay[log.date] ??= { completed: 0, approved: 0, penalties: 0 };
      if (log.status !== TaskExecutionStatus.PENDING) byDay[log.date].completed++;
      if (log.status === TaskExecutionStatus.APPROVED) byDay[log.date].approved++;
    }
    for (const entry of history) {
      if (entry.type !== 'penalty') continue;
      const day = new Date(entry.createdAt).toISOString().split('T')[0];
      byDay[day] ??= { completed: 0, approved: 0, penalties: 0 };
      byDay[day].penalties++;
    }

    const starsEarned = history
      .filter((e) => e.starsChange > 0)
      .reduce((sum, e) => sum + e.starsChange, 0);
    const starsLost = Math.abs(
      history.filter((e) => e.starsChange < 0).reduce((sum, e) => sum + e.starsChange, 0),
    );
    const penaltyCount = history.filter((e) => e.type === 'penalty').length;

    return {
      child: {
        id: child.id,
        name: child.name,
        currentStars: child.currentStars,
        currentStreak: child.currentStreak,
        longestStreak: child.longestStreak,
        streakFreezes: child.streakFreezes,
      },
      since: sinceDate,
      totals: {
        starsEarned,
        starsLost,
        penalties: penaltyCount,
        tasksCompleted: logs.filter((l) => l.status !== TaskExecutionStatus.PENDING).length,
        tasksApproved: logs.filter((l) => l.status === TaskExecutionStatus.APPROVED).length,
      },
      byDay: Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, stats]) => ({ date, ...stats })),
    };
  }
}

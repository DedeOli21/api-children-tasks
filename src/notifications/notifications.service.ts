import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, MoreThan, Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import {
  Notification,
  NotificationType,
  User,
  TeacherStudent,
  Mission,
  MissionStatus,
} from '../entities';

/**
 * Caixa de notificações in-app. Push/email são canais de entrega que
 * consumirão estes registros no futuro — o app funciona sem eles.
 * dedupeKey garante no máximo um aviso do mesmo assunto (ex: por dia).
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(TeacherStudent)
    private teacherStudentRepository: Repository<TeacherStudent>,
    @InjectRepository(Mission)
    private missionRepository: Repository<Mission>,
  ) {}

  async notify(
    userId: string,
    type: NotificationType,
    title: string,
    body?: string,
    dedupeKey?: string,
  ): Promise<Notification | null> {
    return this.notifyWith(this.notificationRepository.manager, userId, type, title, body, dedupeKey);
  }

  // Variante para participar de uma transação em andamento
  async notifyWith(
    manager: EntityManager,
    userId: string,
    type: NotificationType,
    title: string,
    body?: string,
    dedupeKey?: string,
  ): Promise<Notification | null> {
    if (dedupeKey) {
      const existing = await manager.findOne(Notification, {
        where: { userId, dedupeKey },
      });
      if (existing) return null;
    }
    return manager.save(
      manager.create(Notification, {
        userId,
        type,
        title,
        body: body ?? null,
        dedupeKey: dedupeKey ?? null,
      }),
    );
  }

  async list(userId: string, limit = 50) {
    const notifications = await this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 100),
    });
    return notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    }));
  }

  async unreadCount(userId: string) {
    const unread = await this.notificationRepository.count({
      where: { userId, readAt: IsNull() },
    });
    return { unread };
  }

  async markAllRead(userId: string) {
    const result = await this.notificationRepository.update(
      { userId, readAt: IsNull() },
      { readAt: new Date() },
    );
    return { marked: result.affected ?? 0 };
  }

  // Resumo semanal para professores (segunda-feira, 07:30)
  @Cron('30 7 * * 1')
  async weeklyTeacherSummary() {
    const links = await this.teacherStudentRepository.find();
    const studentsByTeacher = new Map<string, number>();
    for (const link of links) {
      studentsByTeacher.set(link.teacherId, (studentsByTeacher.get(link.teacherId) ?? 0) + 1);
    }

    const since = new Date();
    since.setDate(since.getDate() - 7);
    const weekKey = new Date().toISOString().split('T')[0];

    for (const [teacherId, studentCount] of studentsByTeacher) {
      const approved = await this.missionRepository.count({
        where: {
          createdById: teacherId,
          status: MissionStatus.APPROVED,
          approvedAt: MoreThan(since),
        },
      });
      await this.notify(
        teacherId,
        NotificationType.WEEKLY_SUMMARY,
        '📊 Seu resumo da semana',
        `${studentCount} aluno(s) vinculados · ${approved} missão(ões) aprovadas pelas famílias nos últimos 7 dias.`,
        `weekly_summary:${weekKey}`,
      );
    }
    this.logger.log(`Resumo semanal enviado para ${studentsByTeacher.size} professor(es)`);
  }
}

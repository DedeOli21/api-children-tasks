import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FocusSession,
  FocusSessionStatus,
  Mission,
  MissionStatus,
  User,
} from '../entities';
import { StartFocusDto } from './dto/start-focus.dto';

// Modo Foco: pomodoro lúdico para missões acadêmicas
@Injectable()
export class FocusService {
  constructor(
    @InjectRepository(FocusSession)
    private focusRepository: Repository<FocusSession>,
    @InjectRepository(Mission)
    private missionRepository: Repository<Mission>,
  ) {}

  async start(child: User, dto: StartFocusDto) {
    if (dto.missionId) {
      const mission = await this.missionRepository.findOne({
        where: { id: dto.missionId },
      });
      if (!mission || mission.assignedToId !== child.id) {
        throw new NotFoundException('Missão não encontrada');
      }
      if (mission.status !== MissionStatus.SCHEDULED) {
        throw new BadRequestException(
          'Inicie o foco apenas para uma missão alocada no calendário',
        );
      }
    }

    // Uma sessão por vez: iniciar outra abandona a anterior
    await this.focusRepository.update(
      { childId: child.id, status: FocusSessionStatus.RUNNING },
      { status: FocusSessionStatus.ABANDONED, endedAt: new Date() },
    );

    return this.focusRepository.save(
      this.focusRepository.create({
        childId: child.id,
        missionId: dto.missionId ?? null,
        durationMinutes: dto.durationMinutes,
        status: FocusSessionStatus.RUNNING,
        startedAt: new Date(),
      }),
    );
  }

  async finish(child: User, sessionId: string, outcome: 'complete' | 'abandon') {
    const session = await this.focusRepository.findOne({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('Sessão de foco não encontrada');
    }
    if (session.childId !== child.id) {
      throw new ForbiddenException('Essa sessão não é sua');
    }
    if (session.status !== FocusSessionStatus.RUNNING) {
      throw new BadRequestException('Sessão já encerrada');
    }

    session.status =
      outcome === 'complete'
        ? FocusSessionStatus.COMPLETED
        : FocusSessionStatus.ABANDONED;
    session.endedAt = new Date();
    await this.focusRepository.save(session);

    return {
      ...session,
      message:
        outcome === 'complete'
          ? `Foco de ${session.durationMinutes} min concluído! 🧠✨`
          : 'Sessão interrompida. Tudo bem, tente de novo mais tarde!',
    };
  }

  // Histórico de foco (criança vê o seu; adultos com vínculo acompanham)
  async history(childId: string, limit = 30) {
    const sessions = await this.focusRepository.find({
      where: { childId },
      relations: ['mission'],
      order: { startedAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 100),
    });
    return sessions.map((session) => ({
      id: session.id,
      durationMinutes: session.durationMinutes,
      status: session.status,
      missionTitle: session.mission?.title ?? null,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
    }));
  }
}

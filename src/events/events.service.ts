import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { RewardEvent } from '../entities';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(RewardEvent)
    private eventRepository: Repository<RewardEvent>,
  ) {}

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }

  async create(familyId: string, dto: CreateEventDto) {
    if (dto.endsAt < dto.startsAt) {
      throw new BadRequestException('endsAt deve ser igual ou posterior a startsAt');
    }
    const event = await this.eventRepository.save(
      this.eventRepository.create({
        familyId,
        name: dto.name,
        emoji: dto.emoji ?? '🎉',
        multiplier: dto.multiplier,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
      }),
    );
    return event;
  }

  async findAll(familyId: string) {
    const today = this.today();
    const events = await this.eventRepository.find({
      where: { familyId },
      order: { startsAt: 'DESC' },
      take: 50,
    });
    return events.map((event) => ({
      ...event,
      isLive: event.active && event.startsAt <= today && event.endsAt >= today,
    }));
  }

  async deactivate(familyId: string, id: string) {
    const event = await this.eventRepository.findOne({ where: { id, familyId } });
    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }
    event.active = false;
    await this.eventRepository.save(event);
    return { ...event, message: `Evento "${event.name}" encerrado` };
  }

  /**
   * Multiplicador de evento vigente para a família (1 quando não há evento).
   * Usado nos três pontos de crédito por aprovação: tarefas, missões e
   * bonificações sugeridas por terapeuta. Ajustes manuais não multiplicam.
   */
  async activeMultiplier(familyId: string): Promise<{ multiplier: number; event: RewardEvent | null }> {
    const today = this.today();
    const event = await this.eventRepository.findOne({
      where: {
        familyId,
        active: true,
        startsAt: LessThanOrEqual(today),
        endsAt: MoreThanOrEqual(today),
      },
      order: { multiplier: 'DESC' },
    });
    return { multiplier: event?.multiplier ?? 1, event: event ?? null };
  }
}

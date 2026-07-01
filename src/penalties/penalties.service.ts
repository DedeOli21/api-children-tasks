import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Penalty, User, HistoryEntry, HistoryType } from '../entities';
import { CreatePenaltyDto } from './dto/create-penalty.dto';
import { UpdatePenaltyDto } from './dto/update-penalty.dto';
import { ApplyPenaltyDto } from './dto/apply-penalty.dto';
import { StreaksService } from '../streaks/streaks.service';

@Injectable()
export class PenaltiesService {
  constructor(
    @InjectRepository(Penalty)
    private penaltyRepository: Repository<Penalty>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(HistoryEntry)
    private historyRepository: Repository<HistoryEntry>,
    @Inject(forwardRef(() => StreaksService))
    private streaksService: StreaksService,
  ) {}

  async findAll(familyId: string) {
    return this.penaltyRepository.find({
      where: { active: true, familyId },
      order: { createdAt: 'ASC' },
    });
  }

  async create(createPenaltyDto: CreatePenaltyDto, familyId: string) {
    const penalty = this.penaltyRepository.create({
      ...createPenaltyDto,
      familyId,
    });
    return this.penaltyRepository.save(penalty);
  }

  async update(id: string, updatePenaltyDto: UpdatePenaltyDto, familyId: string) {
    const penalty = await this.penaltyRepository.findOne({
      where: { id, familyId },
    });

    if (!penalty) {
      throw new NotFoundException('Penalidade não encontrada');
    }

    Object.assign(penalty, updatePenaltyDto);
    return this.penaltyRepository.save(penalty);
  }

  async delete(id: string, familyId: string) {
    const penalty = await this.penaltyRepository.findOne({
      where: { id, familyId },
    });

    if (!penalty) {
      throw new NotFoundException('Penalidade não encontrada');
    }

    await this.penaltyRepository.remove(penalty);
    return { message: 'Penalidade removida com sucesso' };
  }

  async applyPenalty(childId: string, familyId: string, dto: ApplyPenaltyDto) {
    const penalty = await this.penaltyRepository.findOne({
      where: { id: dto.penaltyId, familyId },
    });

    if (!penalty) {
      throw new NotFoundException('Penalidade não encontrada');
    }

    const user = await this.userRepository.findOne({
      where: { id: childId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Não deixa o saldo ficar negativo
    const amountToSubtract = Math.min(
      dto.amount || penalty.amount,
      user.currentStars,
    );

    user.currentStars -= amountToSubtract;
    await this.userRepository.save(user);

    // Resetar streak quando penalidade é aplicada
    await this.streaksService.resetStreak(childId);

    // Registrar no histórico
    const historyEntry = this.historyRepository.create({
      userId: childId,
      type: HistoryType.PENALTY,
      description: `Penalidade aplicada: ${penalty.title} (${penalty.emoji}) - Streak resetado`,
      starsChange: -amountToSubtract,
    });
    await this.historyRepository.save(historyEntry);

    return {
      penalty,
      starsSubtracted: amountToSubtract,
      currentStars: user.currentStars,
      streakReset: true,
      message: `Penalidade "${penalty.title}" aplicada. -${amountToSubtract} estrela(s). Streak resetado!`,
    };
  }
}


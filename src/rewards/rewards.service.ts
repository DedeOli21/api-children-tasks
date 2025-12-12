import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reward, User, HistoryEntry, HistoryType } from '../entities';
import { CreateRewardDto } from './dto/create-reward.dto';

@Injectable()
export class RewardsService {
  constructor(
    @InjectRepository(Reward)
    private rewardRepository: Repository<Reward>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(HistoryEntry)
    private historyRepository: Repository<HistoryEntry>,
  ) {}

  async findAll() {
    return this.rewardRepository.find({
      where: { active: true },
      order: { createdAt: 'ASC' },
    });
  }

  async create(createRewardDto: CreateRewardDto) {
    const reward = this.rewardRepository.create(createRewardDto);
    return this.rewardRepository.save(reward);
  }

  async delete(id: string) {
    const reward = await this.rewardRepository.findOne({ where: { id } });

    if (!reward) {
      throw new NotFoundException('Recompensa não encontrada');
    }

    await this.rewardRepository.remove(reward);
    return { message: 'Recompensa removida com sucesso' };
  }

  async redeemReward(userId: string, rewardId: string) {
    const reward = await this.rewardRepository.findOne({
      where: { id: rewardId },
    });

    if (!reward) {
      throw new NotFoundException('Recompensa não encontrada');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.currentStars < reward.cost) {
      throw new BadRequestException(
        `Estrelas insuficientes. Você tem ${user.currentStars} estrelas, mas precisa de ${reward.cost}.`,
      );
    }

    user.currentStars -= reward.cost;
    await this.userRepository.save(user);

    // Registrar no histórico
    const historyEntry = this.historyRepository.create({
      userId,
      type: HistoryType.REWARD_REDEEM,
      description: `Resgatou recompensa: ${reward.title} (${reward.emoji})`,
      starsChange: -reward.cost,
    });
    await this.historyRepository.save(historyEntry);

    return {
      reward,
      starsSpent: reward.cost,
      currentStars: user.currentStars,
      message: `Recompensa "${reward.title}" resgatada! -${reward.cost} estrelas`,
    };
  }
}


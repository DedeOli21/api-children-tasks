import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Reward, RewardKind, User, HistoryEntry, HistoryType } from '../entities';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';

@Injectable()
export class RewardsService {
  constructor(
    @InjectRepository(Reward)
    private rewardRepository: Repository<Reward>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(HistoryEntry)
    private historyRepository: Repository<HistoryEntry>,
    private dataSource: DataSource,
  ) {}

  async findAll(familyId: string) {
    return this.rewardRepository.find({
      where: { active: true, familyId },
      order: { createdAt: 'ASC' },
    });
  }

  async create(createRewardDto: CreateRewardDto, familyId: string) {
    const reward = this.rewardRepository.create({
      ...createRewardDto,
      familyId,
      kind: createRewardDto.kind ?? RewardKind.PRIVILEGE,
      description: createRewardDto.description ?? null,
    });
    return this.rewardRepository.save(reward);
  }

  async update(id: string, updateRewardDto: UpdateRewardDto, familyId: string) {
    const reward = await this.rewardRepository.findOne({
      where: { id, familyId },
    });

    if (!reward) {
      throw new NotFoundException('Recompensa não encontrada');
    }

    Object.assign(reward, updateRewardDto);
    return this.rewardRepository.save(reward);
  }

  async delete(id: string, familyId: string) {
    const reward = await this.rewardRepository.findOne({
      where: { id, familyId },
    });

    if (!reward) {
      throw new NotFoundException('Recompensa não encontrada');
    }

    await this.rewardRepository.remove(reward);
    return { message: 'Recompensa removida com sucesso' };
  }

  /**
   * Resgate transacional: débito das estrelas, efeito do item e histórico
   * acontecem juntos ou não acontecem. Itens do tipo streak_freeze
   * ("Escudo Mágico") creditam +1 proteção em vez de um privilégio.
   */
  async redeemReward(userId: string, rewardId: string, familyId: string) {
    return this.dataSource.transaction(async (manager) => {
      const reward = await manager.findOne(Reward, {
        where: { id: rewardId, familyId, active: true },
      });

      if (!reward) {
        throw new NotFoundException('Recompensa não encontrada');
      }

      const user = await manager.findOne(User, { where: { id: userId } });

      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }

      if (user.currentStars < reward.cost) {
        throw new BadRequestException(
          `Estrelas insuficientes. Você tem ${user.currentStars} estrelas, mas precisa de ${reward.cost}.`,
        );
      }

      user.currentStars -= reward.cost;

      const isFreeze = reward.kind === RewardKind.STREAK_FREEZE;
      if (isFreeze) {
        user.streakFreezes += 1;
      }
      await manager.save(user);

      await manager.save(
        manager.create(HistoryEntry, {
          userId,
          type: HistoryType.REWARD_REDEEM,
          description: isFreeze
            ? `Comprou ${reward.title} (${reward.emoji}): +1 proteção de sequência`
            : `Resgatou recompensa: ${reward.title} (${reward.emoji})`,
          starsChange: -reward.cost,
        }),
      );

      return {
        reward,
        starsSpent: reward.cost,
        currentStars: user.currentStars,
        streakFreezes: user.streakFreezes,
        message: isFreeze
          ? `${reward.emoji} "${reward.title}" guardado! Sua sequência está protegida (${user.streakFreezes} no total)`
          : `Recompensa "${reward.title}" resgatada! -${reward.cost} estrelas`,
      };
    });
  }
}

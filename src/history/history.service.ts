import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { HistoryEntry } from '../entities';

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(HistoryEntry)
    private historyRepository: Repository<HistoryEntry>,
  ) {}

  async findAll(userId: string, limit?: number) {
    return this.historyRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit || 50,
    });
  }

  async findByDateRange(userId: string, startDate: Date, endDate: Date) {
    return this.historyRepository.find({
      where: {
        userId,
        createdAt: Between(startDate, endDate),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getStatistics(userId: string) {
    const history = await this.historyRepository.find({
      where: { userId },
    });

    const stats = {
      totalTasksCompleted: 0,
      totalPenalties: 0,
      totalRewardsRedeemed: 0,
      totalStarsEarned: 0,
      totalStarsSpent: 0,
    };

    for (const entry of history) {
      switch (entry.type) {
        case 'task_complete':
          stats.totalTasksCompleted++;
          stats.totalStarsEarned += entry.starsChange;
          break;
        case 'penalty':
          stats.totalPenalties++;
          stats.totalStarsSpent += Math.abs(entry.starsChange);
          break;
        case 'reward_redeem':
          stats.totalRewardsRedeemed++;
          stats.totalStarsSpent += Math.abs(entry.starsChange);
          break;
        case 'stars_add':
          stats.totalStarsEarned += entry.starsChange;
          break;
        case 'stars_subtract':
          stats.totalStarsSpent += Math.abs(entry.starsChange);
          break;
      }
    }

    return stats;
  }
}


import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, DailyLog, Task, HistoryEntry, HistoryType } from '../entities';

@Injectable()
export class StreaksService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(DailyLog)
    private dailyLogRepository: Repository<DailyLog>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(HistoryEntry)
    private historyRepository: Repository<HistoryEntry>,
  ) {}

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getYesterdayDate(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  /**
   * Calcula o multiplicador baseado no streak atual
   * - 0-1 dias: 1x (normal)
   * - 2-5 dias: 2x (dobro)
   * - 6+ dias: 3x (triplo)
   */
  getStreakMultiplier(streak: number): number {
    if (streak >= 6) return 3;
    if (streak >= 2) return 2;
    return 1;
  }

  /**
   * Verifica se o usuário completou todas as tarefas do dia
   */
  async hasCompletedAllTasks(userId: string, date: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    // Considera apenas as tarefas da família da criança
    const activeTasks = await this.taskRepository.find({
      where: { active: true, familyId: user?.parentId ?? '' },
    });

    if (activeTasks.length === 0) return true;

    const dailyLogs = await this.dailyLogRepository.find({
      where: { userId, date },
    });

    const completedTaskIds = new Set(
      dailyLogs.filter((log) => log.completed).map((log) => log.taskId),
    );

    return activeTasks.every((task) => completedTaskIds.has(task.id));
  }

  /**
   * Verifica se o usuário recebeu alguma penalidade no dia
   */
  async hasReceivedPenalty(userId: string, date: string): Promise<boolean> {
    const startOfDay = new Date(date + 'T00:00:00.000Z');
    const endOfDay = new Date(date + 'T23:59:59.999Z');

    const penalties = await this.historyRepository.find({
      where: {
        userId,
        type: HistoryType.PENALTY,
      },
    });

    return penalties.some((entry) => {
      const entryDate = new Date(entry.createdAt);
      return entryDate >= startOfDay && entryDate <= endOfDay;
    });
  }

  /**
   * Atualiza o streak do usuário baseado nas regras:
   * - Mantém streak se completou todas as tarefas E não recebeu penalidade
   * - Reseta streak se recebeu penalidade OU não completou todas as tarefas
   */
  async updateStreak(userId: string): Promise<{ streak: number; multiplier: number; wasReset: boolean }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const today = this.getTodayDate();
    const yesterday = this.getYesterdayDate();

    // Verificar condições para manter o streak
    const completedAllTasks = await this.hasCompletedAllTasks(userId, today);
    const receivedPenalty = await this.hasReceivedPenalty(userId, today);

    let wasReset = false;

    // Se recebeu penalidade OU não completou todas as tarefas, reseta o streak
    if (receivedPenalty || !completedAllTasks) {
      if (user.currentStreak > 0) {
        wasReset = true;
        user.currentStreak = 0;
        user.lastStreakDate = null;
        await this.userRepository.save(user);
      }
      return {
        streak: 0,
        multiplier: 1,
        wasReset,
      };
    }

    // Se completou tudo e não recebeu penalidade, incrementa o streak
    if (user.lastStreakDate === today) {
      // Já atualizou hoje, retorna o valor atual
      return {
        streak: user.currentStreak,
        multiplier: this.getStreakMultiplier(user.currentStreak),
        wasReset: false,
      };
    }

    if (user.lastStreakDate === yesterday) {
      // Continua o streak
      user.currentStreak += 1;
    } else if (user.lastStreakDate === null || user.lastStreakDate < yesterday) {
      // Novo streak (primeiro dia ou streak quebrado)
      user.currentStreak = 1;
    }

    user.lastStreakDate = today;
    await this.userRepository.save(user);

    return {
      streak: user.currentStreak,
      multiplier: this.getStreakMultiplier(user.currentStreak),
      wasReset: false,
    };
  }

  /**
   * Reseta o streak do usuário (usado quando penalidade é aplicada)
   */
  async resetStreak(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.currentStreak > 0) {
      user.currentStreak = 0;
      user.lastStreakDate = null;
      await this.userRepository.save(user);
    }
  }

  /**
   * Obtém informações do streak atual
   */
  async getStreak(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Atualiza o streak antes de retornar
    const streakInfo = await this.updateStreak(userId);

    return {
      currentStreak: streakInfo.streak,
      multiplier: streakInfo.multiplier,
      lastStreakDate: user.lastStreakDate,
      nextMultiplierThreshold: streakInfo.streak < 2 ? 2 : streakInfo.streak < 6 ? 6 : null,
    };
  }
}


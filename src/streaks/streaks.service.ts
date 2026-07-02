import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import {
  User,
  UserRole,
  DailyLog,
  Task,
  HistoryEntry,
  HistoryType,
  TaskExecutionStatus,
} from '../entities';

/**
 * Motor de streaks:
 * - O streak conta dias em que a criança completou todos os combinados.
 * - Dias perdidos consomem um "Streak Freeze" do inventário (se houver)
 *   antes de quebrar a sequência.
 * - Penalidade continua sendo reset imediato (regra disciplinar explícita —
 *   o freeze protege contra dias incompletos, não contra mau comportamento).
 * - Avaliação acontece de forma preguiçosa (em cada leitura/conclusão) e
 *   também via cron diário, para quem ficou dias sem abrir o app.
 */
@Injectable()
export class StreaksService {
  private readonly logger = new Logger(StreaksService.name);

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

  private toDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getTodayDate(): string {
    return this.toDateString(new Date());
  }

  private previousDay(date: string): string {
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return this.toDateString(d);
  }

  private nextDay(date: string): string {
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return this.toDateString(d);
  }

  /**
   * Multiplicador baseado no streak atual:
   * 0-1 dias: 1x · 2-5 dias: 2x · 6+ dias: 3x
   */
  getStreakMultiplier(streak: number): number {
    if (streak >= 6) return 3;
    if (streak >= 2) return 2;
    return 1;
  }

  private getPlantState(user: User) {
    const streak = user.currentStreak;
    const withered = streak === 0 && Boolean(user.streakBrokenAt);

    if (withered) {
      return {
        state: 'withered',
        stage: 'withered',
        emoji: '🥀',
        label: 'Murcha',
        streakBrokenAt: user.streakBrokenAt,
        protectedByFreezes: user.streakFreezes > 0,
        nextGrowthAt: 1,
      };
    }

    if (streak >= 14) {
      return {
        state: 'healthy',
        stage: 'blooming',
        emoji: '🌻',
        label: 'Florescendo',
        streakBrokenAt: user.streakBrokenAt,
        protectedByFreezes: user.streakFreezes > 0,
        nextGrowthAt: null,
      };
    }

    if (streak >= 6) {
      return {
        state: 'healthy',
        stage: 'budding',
        emoji: '🌷',
        label: 'Com botões',
        streakBrokenAt: user.streakBrokenAt,
        protectedByFreezes: user.streakFreezes > 0,
        nextGrowthAt: 14,
      };
    }

    if (streak >= 2) {
      return {
        state: 'healthy',
        stage: 'leafy',
        emoji: '🌿',
        label: 'Cheia de folhas',
        streakBrokenAt: user.streakBrokenAt,
        protectedByFreezes: user.streakFreezes > 0,
        nextGrowthAt: 6,
      };
    }

    if (streak === 1) {
      return {
        state: 'healthy',
        stage: 'sprout',
        emoji: '🌱',
        label: 'Brotinho',
        streakBrokenAt: user.streakBrokenAt,
        protectedByFreezes: user.streakFreezes > 0,
        nextGrowthAt: 2,
      };
    }

    return {
      state: user.streakFreezes > 0 ? 'protected' : 'seed',
      stage: 'seed',
      emoji: '🪴',
      label: 'Semente',
      streakBrokenAt: user.streakBrokenAt,
      protectedByFreezes: user.streakFreezes > 0,
      nextGrowthAt: 1,
    };
  }

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
      dailyLogs
        .filter((log) => log.status !== TaskExecutionStatus.PENDING)
        .map((log) => log.taskId),
    );

    return activeTasks.every((task) => completedTaskIds.has(task.id));
  }

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
   * Preenche a lacuna entre o último dia contado e ontem:
   * - dia completo → streak continua (e incrementa, cobrindo contagem retroativa);
   * - dia incompleto com freeze no inventário → consome 1 e preserva o streak;
   * - dia incompleto sem freeze → quebra a sequência.
   * Retorna quantos freezes foram consumidos (para feedback).
   */
  private async evaluatePendingDays(user: User): Promise<number> {
    const today = this.getTodayDate();
    const yesterday = this.previousDay(today);
    let freezesUsed = 0;

    if (!user.lastStreakDate || user.currentStreak === 0) return 0;
    if (user.lastStreakDate >= yesterday) return 0; // nada pendente

    let cursor = this.nextDay(user.lastStreakDate);
    while (cursor <= yesterday) {
      const completed = await this.hasCompletedAllTasks(user.id, cursor);
      if (completed) {
        user.currentStreak += 1;
        user.lastStreakDate = cursor;
      } else if (user.streakFreezes > 0) {
        user.streakFreezes -= 1;
        user.lastStreakDate = cursor; // dia "congelado": não quebra nem incrementa
        freezesUsed += 1;
        await this.historyRepository.save(
          this.historyRepository.create({
            userId: user.id,
            type: HistoryType.STREAK_FREEZE_USED,
            description: `Regador Mágico consumido automaticamente para proteger o streak em ${cursor}`,
            starsChange: 0,
          }),
        );
      } else {
        user.streakBrokenAt = cursor;
        user.currentStreak = 0;
        user.lastStreakDate = null;
        break;
      }
      cursor = this.nextDay(cursor);
    }

    if (user.currentStreak > user.longestStreak) {
      user.longestStreak = user.currentStreak;
    }
    await this.userRepository.save(user);
    return freezesUsed;
  }

  /**
   * Chamado quando a criança completa uma tarefa (e nas leituras de streak).
   * Nunca zera a sequência no meio do dia — dias passados são resolvidos
   * por evaluatePendingDays e o dia atual só conta quando fecha completo.
   */
  async updateStreak(userId: string): Promise<{ streak: number; multiplier: number; wasReset: boolean; freezesUsed: number }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const freezesUsed = await this.evaluatePendingDays(user);

    const today = this.getTodayDate();
    const yesterday = this.previousDay(today);

    // Penalidade hoje = reset imediato (regra disciplinar, freeze não protege)
    if (await this.hasReceivedPenalty(userId, today)) {
      const wasReset = user.currentStreak > 0;
      if (wasReset || user.lastStreakDate) {
        user.currentStreak = 0;
        user.lastStreakDate = null;
        user.streakBrokenAt = today;
        await this.userRepository.save(user);
      }
      return { streak: 0, multiplier: 1, wasReset, freezesUsed };
    }

    // Dia ainda incompleto: mantém o streak atual (não zera no meio do dia)
    if (!(await this.hasCompletedAllTasks(userId, today))) {
      return {
        streak: user.currentStreak,
        multiplier: this.getStreakMultiplier(user.currentStreak),
        wasReset: false,
        freezesUsed,
      };
    }

    // Já contabilizou hoje
    if (user.lastStreakDate === today) {
      return {
        streak: user.currentStreak,
        multiplier: this.getStreakMultiplier(user.currentStreak),
        wasReset: false,
        freezesUsed,
      };
    }

    // Fecha o dia: continua a sequência ou começa uma nova
    user.currentStreak = user.lastStreakDate === yesterday ? user.currentStreak + 1 : 1;
    user.lastStreakDate = today;
    if (user.currentStreak > user.longestStreak) {
      user.longestStreak = user.currentStreak;
    }
    await this.userRepository.save(user);

    return {
      streak: user.currentStreak,
      multiplier: this.getStreakMultiplier(user.currentStreak),
      wasReset: false,
      freezesUsed,
    };
  }

  // Reset explícito (penalidade aplicada pelo responsável)
  async resetStreak(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.currentStreak > 0 || user.lastStreakDate) {
      user.currentStreak = 0;
      user.lastStreakDate = null;
      user.streakBrokenAt = this.getTodayDate();
      await this.userRepository.save(user);
    }
  }

  async getStreak(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const streakInfo = await this.updateStreak(userId);
    const freshUser =
      (await this.userRepository.findOne({ where: { id: userId } })) ?? user;

    return {
      currentStreak: streakInfo.streak,
      multiplier: streakInfo.multiplier,
      longestStreak: Math.max(freshUser.longestStreak, streakInfo.streak),
      streakFreezes: freshUser.streakFreezes,
      lastStreakDate: freshUser.lastStreakDate,
      streakBrokenAt: freshUser.streakBrokenAt,
      plant: this.getPlantState(freshUser),
      nextMultiplierThreshold: streakInfo.streak < 2 ? 2 : streakInfo.streak < 6 ? 6 : null,
    };
  }

  // Responsável concede freezes ao inventário da criança
  async grantFreezes(childId: string, amount: number) {
    const child = await this.userRepository.findOne({ where: { id: childId } });
    if (!child) {
      throw new NotFoundException('Criança não encontrada');
    }
    child.streakFreezes += amount;
    await this.userRepository.save(child);
    return {
      childId: child.id,
      streakFreezes: child.streakFreezes,
      message: `+${amount} congelamento(s) de streak para ${child.name}`,
    };
  }

  // Cron diário: fecha o dia anterior de todas as crianças, consumindo
  // freezes quando necessário (cobre quem ficou sem abrir o app).
  @Cron('10 0 * * *')
  async evaluateAllChildren() {
    const children = await this.userRepository.find({
      where: { role: UserRole.CHILD },
    });
    let frozen = 0;
    for (const child of children) {
      try {
        frozen += await this.evaluatePendingDays(child);
      } catch (error) {
        this.logger.error(`Falha ao avaliar streak de ${child.id}`, error as Error);
      }
    }
    this.logger.log(
      `Streaks avaliados para ${children.length} criança(s); ${frozen} freeze(s) consumido(s)`,
    );
  }
}

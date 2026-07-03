import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThanOrEqual, Repository } from 'typeorm';
import {
  User,
  HistoryEntry,
  Observation,
  BehaviorReport,
} from '../entities';

export interface ReportEvent {
  at: Date;
  category: string;
  author: string;
  description: string;
  starsChange: number | null;
}

/**
 * Compila o relatório da criança (histórico de estrelas, variação de streak
 * implícita nos eventos, relatórios escolares e notas comportamentais).
 * O PDF é gerado no cliente (jspdf) a partir do JSON; o CSV é gerado aqui.
 */
@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(HistoryEntry)
    private historyRepository: Repository<HistoryEntry>,
    @InjectRepository(Observation)
    private observationRepository: Repository<Observation>,
    @InjectRepository(BehaviorReport)
    private behaviorReportRepository: Repository<BehaviorReport>,
  ) {}

  async compile(child: User, days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);
    const sinceDate = since.toISOString().split('T')[0];

    const [history, observations, schoolReports] = await Promise.all([
      this.historyRepository.find({
        where: { userId: child.id, createdAt: Between(since, new Date()) },
        order: { createdAt: 'ASC' },
        take: 500,
      }),
      this.observationRepository.find({
        where: { childId: child.id, date: MoreThanOrEqual(sinceDate) },
        relations: ['author'],
        order: { createdAt: 'ASC' },
      }),
      this.behaviorReportRepository.find({
        where: { childId: child.id, date: MoreThanOrEqual(sinceDate) },
        relations: ['teacher'],
        order: { createdAt: 'ASC' },
      }),
    ]);

    const categoryLabels: Record<string, string> = {
      task_complete: 'Tarefa/Missão',
      penalty: 'Penalidade (responsável)',
      daily_penalty: 'Penalidade automática',
      reward_redeem: 'Resgate/Compra',
      streak_freeze_used: 'Proteção de streak',
      stars_add: 'Estrelas recebidas',
      stars_subtract: 'Estrelas removidas',
    };

    const events: ReportEvent[] = [
      ...history.map((entry) => ({
        at: entry.createdAt,
        category: categoryLabels[entry.type] ?? entry.type,
        author: '—',
        description: entry.description,
        starsChange: entry.starsChange,
      })),
      ...observations.map((observation) => ({
        at: observation.createdAt,
        category:
          observation.type === 'clinical'
            ? 'Nota clínica'
            : observation.type === 'behavioral'
              ? 'Nota comportamental'
              : 'Observação',
        author: observation.author?.name ?? '—',
        description: observation.text,
        starsChange: null,
      })),
      ...schoolReports.map((report) => ({
        at: report.createdAt,
        category: 'Relatório escolar',
        author: report.teacher?.name ?? '—',
        description: `${report.text}${report.rating ? ` (avaliação ${report.rating}/5)` : ''}`,
        starsChange: report.starsAwarded > 0 ? report.starsAwarded : null,
      })),
    ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    const earned = history
      .filter((e) => e.starsChange > 0)
      .reduce((sum, e) => sum + e.starsChange, 0);
    const lost = Math.abs(
      history.filter((e) => e.starsChange < 0).reduce((sum, e) => sum + e.starsChange, 0),
    );

    return {
      child: {
        id: child.id,
        name: child.name,
        currentStars: child.currentStars,
        currentStreak: child.currentStreak,
        longestStreak: child.longestStreak,
        streakFreezes: child.streakFreezes,
      },
      period: { since: sinceDate, days },
      totals: {
        starsEarned: earned,
        starsLost: lost,
        tasksApproved: history.filter((e) => e.type === 'task_complete').length,
        manualPenalties: history.filter((e) => e.type === 'penalty').length,
        automaticPenalties: history.filter((e) => e.type === 'daily_penalty').length,
        freezesUsed: history.filter((e) => e.type === 'streak_freeze_used').length,
        observations: observations.length,
        schoolReports: schoolReports.length,
      },
      events,
    };
  }

  async exportCsv(child: User, days: number): Promise<string> {
    const report = await this.compile(child, days);

    const escape = (value: string | number | null): string => {
      const text = value === null ? '' : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };

    const lines = [
      // Cabeçalho de contexto
      `# Relatório de ${report.child.name} — últimos ${days} dias (desde ${report.period.since})`,
      `# Estrelas: ${report.child.currentStars} · Streak: ${report.child.currentStreak} (recorde ${report.child.longestStreak})`,
      '',
      ['Data/Hora', 'Categoria', 'Autor', 'Descrição', 'Estrelas'].map(escape).join(','),
      ...report.events.map((event) =>
        [
          new Date(event.at).toISOString(),
          event.category,
          event.author,
          event.description,
          event.starsChange ?? '',
        ]
          .map(escape)
          .join(','),
      ),
    ];

    // BOM para o Excel abrir acentos corretamente
    return '﻿' + lines.join('\n');
  }
}

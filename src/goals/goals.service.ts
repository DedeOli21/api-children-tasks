import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  FamilyGoal,
  FamilyGoalStatus,
  GoalDeposit,
  User,
  HistoryEntry,
  HistoryType,
} from '../entities';
import { CreateGoalDto } from './dto/create-goal.dto';

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(FamilyGoal)
    private goalRepository: Repository<FamilyGoal>,
    @InjectRepository(GoalDeposit)
    private depositRepository: Repository<GoalDeposit>,
    private dataSource: DataSource,
  ) {}

  async create(familyId: string, dto: CreateGoalDto) {
    return this.goalRepository.save(
      this.goalRepository.create({
        familyId,
        title: dto.title,
        emoji: dto.emoji ?? '🎯',
        description: dto.description ?? null,
        targetStars: dto.targetStars,
      }),
    );
  }

  async findAll(familyId: string) {
    return this.goalRepository.find({
      where: { familyId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  // Ledger de depósitos da meta (transparência para a família)
  async deposits(familyId: string, goalId: string) {
    await this.getOwned(familyId, goalId);
    const deposits = await this.depositRepository.find({
      where: { goalId },
      relations: ['child'],
      order: { createdAt: 'DESC' },
    });
    return deposits.map((deposit) => ({
      id: deposit.id,
      amount: deposit.amount,
      childId: deposit.childId,
      childName: deposit.child?.name,
      createdAt: deposit.createdAt,
    }));
  }

  /**
   * Depósito no cofrinho: débito do saldo da criança, crédito na meta,
   * registro no ledger e entrada no histórico — tudo numa única transação.
   */
  async deposit(familyId: string, goalId: string, child: User, amount: number) {
    return this.dataSource.transaction(async (manager) => {
      const goal = await manager.findOne(FamilyGoal, {
        where: { id: goalId, familyId },
      });
      if (!goal) {
        throw new NotFoundException('Meta não encontrada');
      }
      if (goal.status !== FamilyGoalStatus.ACTIVE) {
        throw new BadRequestException('Esta meta não está mais ativa');
      }

      // Recarrega o saldo dentro da transação (evita corrida com outros créditos)
      const freshChild = await manager.findOne(User, { where: { id: child.id } });
      if (!freshChild) {
        throw new NotFoundException('Criança não encontrada');
      }
      if (freshChild.currentStars < amount) {
        throw new BadRequestException(
          `Estrelas insuficientes: ${freshChild.currentStars} no saldo, depósito de ${amount}`,
        );
      }

      freshChild.currentStars -= amount;
      await manager.save(freshChild);

      goal.depositedStars += amount;
      if (goal.depositedStars >= goal.targetStars) {
        goal.status = FamilyGoalStatus.COMPLETED;
        goal.completedAt = new Date();
      }
      await manager.save(goal);

      await manager.save(
        manager.create(GoalDeposit, {
          goalId: goal.id,
          childId: freshChild.id,
          amount,
        }),
      );

      await manager.save(
        manager.create(HistoryEntry, {
          userId: freshChild.id,
          type: HistoryType.STARS_SUBTRACT,
          description: `Depositou no cofrinho "${goal.title}" ${goal.emoji}`,
          starsChange: -amount,
        }),
      );

      const reachedGoal = goal.status === FamilyGoalStatus.COMPLETED;
      return {
        goal,
        currentStars: freshChild.currentStars,
        deposited: amount,
        reachedGoal,
        message: reachedGoal
          ? `🎉 Meta "${goal.title}" alcançada!`
          : `+${amount} estrela(s) no cofrinho "${goal.title}"`,
      };
    });
  }

  /**
   * Cancela a meta devolvendo a cada criança exatamente o que depositou
   * (reconstruído a partir do ledger), numa única transação.
   */
  async cancel(familyId: string, goalId: string) {
    return this.dataSource.transaction(async (manager) => {
      const goal = await manager.findOne(FamilyGoal, {
        where: { id: goalId, familyId },
      });
      if (!goal) {
        throw new NotFoundException('Meta não encontrada');
      }
      if (goal.status !== FamilyGoalStatus.ACTIVE) {
        throw new BadRequestException('Apenas metas ativas podem ser canceladas');
      }

      const deposits = await manager.find(GoalDeposit, { where: { goalId } });
      const totalByChild = new Map<string, number>();
      for (const deposit of deposits) {
        totalByChild.set(
          deposit.childId,
          (totalByChild.get(deposit.childId) ?? 0) + deposit.amount,
        );
      }

      for (const [childId, total] of totalByChild) {
        const child = await manager.findOne(User, { where: { id: childId } });
        if (!child) continue;
        child.currentStars += total;
        await manager.save(child);
        await manager.save(
          manager.create(HistoryEntry, {
            userId: childId,
            type: HistoryType.STARS_ADD,
            description: `Cofrinho "${goal.title}" cancelado: estrelas devolvidas`,
            starsChange: total,
          }),
        );
      }

      goal.status = FamilyGoalStatus.CANCELLED;
      await manager.save(goal);

      return {
        goal,
        refundedChildren: totalByChild.size,
        message: `Meta "${goal.title}" cancelada; estrelas devolvidas a ${totalByChild.size} criança(s)`,
      };
    });
  }

  // Conclusão explícita pelo responsável quando o cofrinho atinge a meta.
  async complete(familyId: string, goalId: string) {
    return this.dataSource.transaction(async (manager) => {
      const goal = await manager.findOne(FamilyGoal, {
        where: { id: goalId, familyId },
      });
      if (!goal) {
        throw new NotFoundException('Meta não encontrada');
      }
      if (goal.status === FamilyGoalStatus.COMPLETED) {
        return {
          goal,
          message: `Meta "${goal.title}" já estava concluída`,
        };
      }
      if (goal.status !== FamilyGoalStatus.ACTIVE) {
        throw new BadRequestException('Esta meta não está ativa');
      }
      if (goal.depositedStars < goal.targetStars) {
        throw new BadRequestException(
          `Meta ainda incompleta: ${goal.depositedStars}/${goal.targetStars} estrela(s)`,
        );
      }

      goal.status = FamilyGoalStatus.COMPLETED;
      goal.completedAt = new Date();
      await manager.save(goal);

      return {
        goal,
        message: `Meta "${goal.title}" concluída!`,
      };
    });
  }

  private async getOwned(familyId: string, goalId: string): Promise<FamilyGoal> {
    const goal = await this.goalRepository.findOne({
      where: { id: goalId, familyId },
    });
    if (!goal) {
      throw new NotFoundException('Meta não encontrada');
    }
    return goal;
  }
}

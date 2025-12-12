import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MysteryPrize, MysteryPrizeRarity, User, HistoryEntry, HistoryType } from '../entities';
import { CreateMysteryPrizeDto } from './dto/create-mystery-prize.dto';
import { UpdateMysteryPrizeDto } from './dto/update-mystery-prize.dto';

@Injectable()
export class MysteryBoxService {
  constructor(
    @InjectRepository(MysteryPrize)
    private mysteryPrizeRepository: Repository<MysteryPrize>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(HistoryEntry)
    private historyRepository: Repository<HistoryEntry>,
  ) {}

  private readonly MYSTERY_BOX_COST = 5; // Custo fixo da caixa

  async getConfig() {
    const prizes = await this.mysteryPrizeRepository.find({
      where: { active: true },
      order: { createdAt: 'ASC' },
    });

    return {
      cost: this.MYSTERY_BOX_COST,
      prizes: prizes.map((prize) => ({
        id: prize.id,
        name: prize.name,
        emoji: prize.emoji,
        rarity: prize.rarity,
        description: prize.description,
        weight: prize.weight,
      })),
    };
  }

  async findAll() {
    return this.mysteryPrizeRepository.find({
      order: { createdAt: 'ASC' },
    });
  }

  async create(createDto: CreateMysteryPrizeDto) {
    const prize = this.mysteryPrizeRepository.create(createDto);
    return this.mysteryPrizeRepository.save(prize);
  }

  async update(id: string, updateDto: UpdateMysteryPrizeDto) {
    const prize = await this.mysteryPrizeRepository.findOne({ where: { id } });

    if (!prize) {
      throw new NotFoundException('Prêmio não encontrado');
    }

    Object.assign(prize, updateDto);
    return this.mysteryPrizeRepository.save(prize);
  }

  async delete(id: string) {
    const prize = await this.mysteryPrizeRepository.findOne({ where: { id } });

    if (!prize) {
      throw new NotFoundException('Prêmio não encontrado');
    }

    await this.mysteryPrizeRepository.remove(prize);
    return { message: 'Prêmio removido com sucesso' };
  }

  async openBox(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar se tem estrelas suficientes
    if (user.currentStars < this.MYSTERY_BOX_COST) {
      throw new BadRequestException(
        `Estrelas insuficientes. Você precisa de ${this.MYSTERY_BOX_COST} estrelas para abrir a caixa.`,
      );
    }

    // Buscar prêmios ativos
    const activePrizes = await this.mysteryPrizeRepository.find({
      where: { active: true },
    });

    if (activePrizes.length === 0) {
      throw new BadRequestException('Nenhum prêmio disponível no momento');
    }

    // Seleção aleatória baseada nos pesos individuais de cada prêmio
    // Quanto maior o peso, maior a chance de ser selecionado
    const totalWeight = activePrizes.reduce((sum, prize) => sum + (prize.weight || 1), 0);
    
    if (totalWeight === 0) {
      // Se todos os pesos forem 0, seleciona aleatoriamente
      const randomPrize = activePrizes[Math.floor(Math.random() * activePrizes.length)];
      return this.finalizePrizeSelection(user, randomPrize);
    }

    let random = Math.random() * totalWeight;
    let selectedPrize: MysteryPrize | null = null;

    // Selecionar prêmio baseado nos pesos
    for (const prize of activePrizes) {
      const prizeWeight = prize.weight || 1;
      random -= prizeWeight;
      if (random <= 0) {
        selectedPrize = prize;
        break;
      }
    }

    // Fallback (não deveria acontecer, mas por segurança)
    if (!selectedPrize) {
      selectedPrize = activePrizes[0];
    }

    return this.finalizePrizeSelection(user, selectedPrize);
  }

  private async finalizePrizeSelection(user: User, prize: MysteryPrize) {
    // Deduzir estrelas
    user.currentStars -= this.MYSTERY_BOX_COST;
    await this.userRepository.save(user);

    // Registrar no histórico
    const historyEntry = this.historyRepository.create({
      userId: user.id,
      type: HistoryType.REWARD_REDEEM,
      description: `Abriu Caixa Surpresa e ganhou: ${prize.name} (${prize.emoji}) - ${prize.rarity}`,
      starsChange: -this.MYSTERY_BOX_COST,
    });
    await this.historyRepository.save(historyEntry);

    return {
      prize: {
        id: prize.id,
        name: prize.name,
        emoji: prize.emoji,
        rarity: prize.rarity,
        description: prize.description,
        weight: prize.weight,
      },
      newBalance: user.currentStars,
    };
  }
}


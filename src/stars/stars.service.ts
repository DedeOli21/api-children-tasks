import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, HistoryEntry, HistoryType } from '../entities';
import { UpdateStarsDto } from './dto/update-stars.dto';

@Injectable()
export class StarsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(HistoryEntry)
    private historyRepository: Repository<HistoryEntry>,
  ) {}

  async getStars(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return {
      userId: user.id,
      currentStars: user.currentStars,
    };
  }

  async addStars(userId: string, dto: UpdateStarsDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    user.currentStars += dto.amount;
    await this.userRepository.save(user);

    // Registrar no histórico
    const historyEntry = this.historyRepository.create({
      userId,
      type: HistoryType.STARS_ADD,
      description: `Adicionou ${dto.amount} estrela(s)`,
      starsChange: dto.amount,
    });
    await this.historyRepository.save(historyEntry);

    return {
      userId: user.id,
      currentStars: user.currentStars,
      added: dto.amount,
    };
  }

  async subtractStars(userId: string, dto: UpdateStarsDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.currentStars < dto.amount) {
      throw new BadRequestException('Estrelas insuficientes');
    }

    user.currentStars -= dto.amount;
    await this.userRepository.save(user);

    // Registrar no histórico
    const historyEntry = this.historyRepository.create({
      userId,
      type: HistoryType.STARS_SUBTRACT,
      description: `Removeu ${dto.amount} estrela(s)`,
      starsChange: -dto.amount,
    });
    await this.historyRepository.save(historyEntry);

    return {
      userId: user.id,
      currentStars: user.currentStars,
      subtracted: dto.amount,
    };
  }
}


import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  User,
  UserRole,
  HistoryEntry,
  HistoryType,
  StarRequest,
  StarRequestStatus,
} from '../entities';
import { UpdateStarsDto } from './dto/update-stars.dto';
import { SuggestStarsDto } from './dto/suggest-stars.dto';

@Injectable()
export class StarsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(HistoryEntry)
    private historyRepository: Repository<HistoryEntry>,
    @InjectRepository(StarRequest)
    private starRequestRepository: Repository<StarRequest>,
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
      description: dto.reason
        ? `Ganhou ${dto.amount} estrela(s): ${dto.reason}`
        : `Adicionou ${dto.amount} estrela(s)`,
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
      description: dto.reason
        ? `Perdeu ${dto.amount} estrela(s): ${dto.reason}`
        : `Removeu ${dto.amount} estrela(s)`,
      starsChange: -dto.amount,
    });
    await this.historyRepository.save(historyEntry);

    return {
      userId: user.id,
      currentStars: user.currentStars,
      subtracted: dto.amount,
    };
  }

  // ============ BONIFICAÇÃO DA TERAPEUTA (workflow de aprovação) ============

  private toPublicRequest(request: StarRequest) {
    return {
      id: request.id,
      childId: request.childId,
      childName: request.child?.name,
      amount: request.amount,
      reason: request.reason,
      status: request.status,
      therapistName: request.createdBy?.name,
      createdAt: request.createdAt,
      resolvedAt: request.resolvedAt,
    };
  }

  // Terapeuta sugere; nada é creditado até o responsável aprovar
  async suggest(therapist: User, child: User, dto: SuggestStarsDto) {
    const request = await this.starRequestRepository.save(
      this.starRequestRepository.create({
        childId: child.id,
        amount: dto.amount,
        reason: dto.reason,
        createdById: therapist.id,
        status: StarRequestStatus.PENDING,
      }),
    );

    return {
      id: request.id,
      childId: child.id,
      amount: request.amount,
      reason: request.reason,
      status: request.status,
      message: `Bonificação sugerida para ${child.name}. Aguardando aprovação do responsável.`,
    };
  }

  // Caixa de aprovação do responsável (pendentes dos seus filhos)
  async listRequestsForParent(parent: User, status?: StarRequestStatus) {
    const children = await this.userRepository.find({
      where: { role: UserRole.CHILD, parentId: parent.id },
      select: ['id'],
    });
    if (children.length === 0) return [];

    const requests = await this.starRequestRepository.find({
      where: {
        childId: In(children.map((c) => c.id)),
        status: status ?? StarRequestStatus.PENDING,
      },
      relations: ['child', 'createdBy'],
      order: { createdAt: 'ASC' },
    });
    return requests.map((request) => this.toPublicRequest(request));
  }

  // Sugestões enviadas pela terapeuta, com o estado atual
  async listRequestsForTherapist(therapist: User) {
    const requests = await this.starRequestRepository.find({
      where: { createdById: therapist.id },
      relations: ['child'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return requests.map((request) => this.toPublicRequest(request));
  }

  // Aprovação do responsável: único ponto que credita a bonificação
  async approveRequest(parent: User, requestId: string) {
    const request = await this.getPendingRequestForParent(parent, requestId);

    request.status = StarRequestStatus.APPROVED;
    request.approvedById = parent.id;
    request.resolvedAt = new Date();
    await this.starRequestRepository.save(request);

    const child = request.child;
    child.currentStars += request.amount;
    await this.userRepository.save(child);

    await this.historyRepository.save(
      this.historyRepository.create({
        userId: child.id,
        type: HistoryType.STARS_ADD,
        description: `💜 Terapeuta ${request.createdBy?.name ?? ''}: ${request.reason}`.trim(),
        starsChange: request.amount,
      }),
    );

    return {
      ...this.toPublicRequest(request),
      currentStars: child.currentStars,
      message: `Bonificação aprovada! +${request.amount} estrela(s) para ${child.name}`,
    };
  }

  async rejectRequest(parent: User, requestId: string) {
    const request = await this.getPendingRequestForParent(parent, requestId);

    request.status = StarRequestStatus.REJECTED;
    request.approvedById = parent.id;
    request.resolvedAt = new Date();
    await this.starRequestRepository.save(request);

    return {
      ...this.toPublicRequest(request),
      message: 'Bonificação recusada. Nenhuma estrela foi creditada.',
    };
  }

  private async getPendingRequestForParent(
    parent: User,
    requestId: string,
  ): Promise<StarRequest> {
    const request = await this.starRequestRepository.findOne({
      where: { id: requestId },
      relations: ['child', 'createdBy'],
    });
    if (!request) {
      throw new NotFoundException('Bonificação não encontrada');
    }
    if (request.child?.parentId !== parent.id) {
      throw new ForbiddenException('Essa bonificação não pertence à sua família');
    }
    if (request.status !== StarRequestStatus.PENDING) {
      throw new BadRequestException('Esta bonificação já foi revisada');
    }
    return request;
  }
}


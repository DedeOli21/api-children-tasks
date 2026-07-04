import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, FindOneOptions, Repository } from 'typeorm';
import { AccessControlService } from '../auth/access-control.service';
import {
  HistoryEntry,
  HistoryType,
  NotificationType,
  ProactiveCategoryIcon,
  ProactiveRequest,
  ProactiveRequestStatus,
  User,
  UserRole,
} from '../entities';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateProactiveRequestDto } from './dto/create-proactive-request.dto';
import { ReviewProactiveRequestDto } from './dto/review-proactive-request.dto';

const CATEGORY_EMOJI: Record<ProactiveCategoryIcon, string> = {
  [ProactiveCategoryIcon.STUDIES]: '📚',
  [ProactiveCategoryIcon.ORGANIZATION]: '🏠',
};

@Injectable()
export class ProactiveRequestsService {
  constructor(
    @InjectRepository(ProactiveRequest)
    private proactiveRequestRepository: Repository<ProactiveRequest>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private accessControl: AccessControlService,
    private notificationsService: NotificationsService,
    private dataSource: DataSource,
  ) {}

  async create(child: User, dto: CreateProactiveRequestDto) {
    if (child.role !== UserRole.CHILD) {
      throw new ForbiddenException('Somente crianças podem enviar Super Iniciativas');
    }

    const familyId = this.accessControl.familyIdOfChild(child);
    const request = await this.proactiveRequestRepository.save(
      this.proactiveRequestRepository.create({
        familyId,
        childId: child.id,
        categoryIcon: dto.categoryIcon,
        description: dto.description.trim(),
        suggestedStars: dto.suggestedStars,
        finalStars: null,
        status: ProactiveRequestStatus.PENDING,
        reviewedById: null,
        reviewedAt: null,
      }),
    );

    await this.notificationsService.notify(
      familyId,
      NotificationType.APPROVAL_PENDING,
      'Super Iniciativa aguardando aprovação',
      `${child.name} sugeriu +${request.suggestedStars} estrela(s): "${request.description}"`,
    );

    return {
      ...this.toPublicRequest({ ...request, child }),
      message: 'Super Iniciativa enviada para aprovação do responsável.',
    };
  }

  async listForChild(child: User, status?: ProactiveRequestStatus) {
    const requests = await this.proactiveRequestRepository.find({
      where: {
        childId: child.id,
        ...(status ? { status } : {}),
      },
      relations: ['child', 'reviewedBy'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return requests.map((request) => this.toPublicRequest(request));
  }

  async listForParent(
    parent: User,
    options: { childId?: string; status?: ProactiveRequestStatus } = {},
  ) {
    let childId = options.childId;
    if (childId) {
      const child = await this.accessControl.resolveChild(parent, childId);
      childId = child.id;
    }

    const requests = await this.proactiveRequestRepository.find({
      where: {
        familyId: parent.id,
        ...(childId ? { childId } : {}),
        ...(options.status ? { status: options.status } : {}),
      },
      relations: ['child', 'reviewedBy'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return requests.map((request) => this.toPublicRequest(request));
  }

  async approve(parent: User, requestId: string, dto: ReviewProactiveRequestDto) {
    return this.dataSource.transaction(async (manager) => {
      const request = await this.findRequestForReview(manager, parent, requestId);
      const finalStars = dto.finalStars ?? request.suggestedStars;
      const status =
        finalStars === request.suggestedStars
          ? ProactiveRequestStatus.APPROVED
          : ProactiveRequestStatus.ADJUSTED;

      const child = await manager.findOne(User, {
        where: { id: request.childId },
      });
      if (!child || child.role !== UserRole.CHILD || child.parentId !== parent.id) {
        throw new ForbiddenException('Essa iniciativa não pertence à sua família');
      }

      request.status = status;
      request.finalStars = finalStars;
      request.reviewedById = parent.id;
      request.reviewedAt = new Date();
      await manager.save(request);

      child.currentStars += finalStars;
      await manager.save(child);

      if (finalStars > 0) {
        await manager.save(
          manager.create(HistoryEntry, {
            userId: child.id,
            type: HistoryType.STARS_ADD,
            description: `Super Iniciativa: ${request.description}`,
            starsChange: finalStars,
          }),
        );
      }

      return {
        ...this.toPublicRequest({ ...request, child, reviewedBy: parent }),
        currentStars: child.currentStars,
        starsEarned: finalStars,
        message:
          status === ProactiveRequestStatus.APPROVED
            ? `Super Iniciativa aprovada! +${finalStars} estrela(s) para ${child.name}`
            : `Super Iniciativa ajustada! +${finalStars} estrela(s) para ${child.name}`,
      };
    });
  }

  async reject(parent: User, requestId: string) {
    return this.dataSource.transaction(async (manager) => {
      const request = await this.findRequestForReview(manager, parent, requestId);
      request.status = ProactiveRequestStatus.REJECTED;
      request.finalStars = 0;
      request.reviewedById = parent.id;
      request.reviewedAt = new Date();
      await manager.save(request);

      return {
        ...this.toPublicRequest({ ...request, reviewedBy: parent }),
        starsEarned: 0,
        message: 'Super Iniciativa recusada. Nenhuma estrela foi creditada.',
      };
    });
  }

  private async findRequestForReview(
    manager: EntityManager,
    parent: User,
    requestId: string,
  ): Promise<ProactiveRequest> {
    const options: FindOneOptions<ProactiveRequest> = {
      where: { id: requestId, familyId: parent.id },
      relations: ['child', 'reviewedBy'],
    };

    if (this.dataSource.options.type === 'postgres') {
      options.lock = { mode: 'pessimistic_write' };
    }

    const request = await manager.findOne(ProactiveRequest, options);
    if (!request) {
      throw new NotFoundException('Super Iniciativa não encontrada');
    }
    if (request.status !== ProactiveRequestStatus.PENDING) {
      throw new BadRequestException('Esta Super Iniciativa já foi revisada');
    }
    return request;
  }

  private toPublicRequest(request: Partial<ProactiveRequest>) {
    return {
      id: request.id,
      familyId: request.familyId,
      childId: request.childId,
      childName: request.child?.name,
      categoryIcon: request.categoryIcon,
      categoryEmoji: request.categoryIcon
        ? CATEGORY_EMOJI[request.categoryIcon]
        : undefined,
      description: request.description,
      suggestedStars: request.suggestedStars,
      finalStars: request.finalStars,
      status: request.status,
      reviewedById: request.reviewedById,
      reviewedByName: request.reviewedBy?.name,
      reviewedAt: request.reviewedAt,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }
}

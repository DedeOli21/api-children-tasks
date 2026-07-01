import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, BehaviorReport } from '../entities';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { generateInviteCode } from './invite-code.util';

@Injectable()
export class ChildrenService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(BehaviorReport)
    private behaviorReportRepository: Repository<BehaviorReport>,
  ) {}

  private toPublic(child: User) {
    return {
      id: child.id,
      name: child.name,
      username: child.email,
      inviteCode: child.inviteCode,
      currentStars: child.currentStars,
      currentStreak: child.currentStreak,
      createdAt: child.createdAt,
    };
  }

  async create(parentId: string, dto: CreateChildDto) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.username },
    });
    if (existing) {
      throw new ConflictException('Nome de usuário já está em uso');
    }

    const child = this.userRepository.create({
      name: dto.name,
      email: dto.username,
      password: await bcrypt.hash(dto.password, 10),
      role: UserRole.CHILD,
      parentId,
      inviteCode: await this.uniqueInviteCode(),
    });
    await this.userRepository.save(child);
    return this.toPublic(child);
  }

  async findAll(parentId: string) {
    const children = await this.userRepository.find({
      where: { role: UserRole.CHILD, parentId },
      order: { createdAt: 'ASC' },
    });
    return children.map((child) => this.toPublic(child));
  }

  async findOne(parentId: string, childId: string) {
    const child = await this.getOwnedChild(parentId, childId);
    return this.toPublic(child);
  }

  async update(parentId: string, childId: string, dto: UpdateChildDto) {
    const child = await this.getOwnedChild(parentId, childId);

    if (dto.name) {
      child.name = dto.name;
    }
    if (dto.password) {
      child.password = await bcrypt.hash(dto.password, 10);
    }

    await this.userRepository.save(child);
    return this.toPublic(child);
  }

  async remove(parentId: string, childId: string) {
    const child = await this.getOwnedChild(parentId, childId);
    await this.userRepository.remove(child);
    return { message: 'Criança removida com sucesso' };
  }

  // Relatórios escolares do filho, visíveis ao responsável
  async findReports(parentId: string, childId: string) {
    await this.getOwnedChild(parentId, childId);

    const reports = await this.behaviorReportRepository.find({
      where: { childId },
      relations: ['teacher'],
      order: { date: 'DESC', createdAt: 'DESC' },
    });

    return reports.map((report) => ({
      id: report.id,
      date: report.date,
      rating: report.rating,
      text: report.text,
      starsAwarded: report.starsAwarded,
      teacherName: report.teacher?.name ?? 'Professor(a)',
      createdAt: report.createdAt,
    }));
  }

  private async getOwnedChild(parentId: string, childId: string): Promise<User> {
    const child = await this.userRepository.findOne({
      where: { id: childId, role: UserRole.CHILD, parentId },
    });
    if (!child) {
      throw new NotFoundException('Criança não encontrada');
    }
    return child;
  }

  private async uniqueInviteCode(): Promise<string> {
    for (;;) {
      const code = generateInviteCode();
      const exists = await this.userRepository.findOne({
        where: { inviteCode: code },
      });
      if (!exists) return code;
    }
  }
}

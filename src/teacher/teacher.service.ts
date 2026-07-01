import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  User,
  UserRole,
  TeacherStudent,
  BehaviorReport,
  HistoryEntry,
  HistoryType,
} from '../entities';
import { AccessControlService } from '../auth/access-control.service';
import { LinkStudentDto } from './dto/link-student.dto';
import { GiveStarsDto } from './dto/give-stars.dto';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class TeacherService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(TeacherStudent)
    private teacherStudentRepository: Repository<TeacherStudent>,
    @InjectRepository(BehaviorReport)
    private behaviorReportRepository: Repository<BehaviorReport>,
    @InjectRepository(HistoryEntry)
    private historyRepository: Repository<HistoryEntry>,
    private accessControl: AccessControlService,
  ) {}

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private toStudent(child: User) {
    return {
      id: child.id,
      name: child.name,
      currentStars: child.currentStars,
      currentStreak: child.currentStreak,
    };
  }

  async linkStudent(teacher: User, dto: LinkStudentDto) {
    const child = await this.userRepository.findOne({
      where: { inviteCode: dto.inviteCode, role: UserRole.CHILD },
    });
    if (!child) {
      throw new NotFoundException('Nenhum aluno encontrado com esse código');
    }

    const existing = await this.teacherStudentRepository.findOne({
      where: { teacherId: teacher.id, childId: child.id },
    });
    if (existing) {
      throw new ConflictException('Aluno já vinculado a você');
    }

    const link = this.teacherStudentRepository.create({
      teacherId: teacher.id,
      childId: child.id,
    });
    await this.teacherStudentRepository.save(link);

    return this.toStudent(child);
  }

  async listStudents(teacher: User) {
    const links = await this.teacherStudentRepository.find({
      where: { teacherId: teacher.id },
      relations: ['child'],
      order: { createdAt: 'ASC' },
    });
    return links
      .filter((link) => link.child)
      .map((link) => this.toStudent(link.child));
  }

  async unlinkStudent(teacher: User, childId: string) {
    const link = await this.teacherStudentRepository.findOne({
      where: { teacherId: teacher.id, childId },
    });
    if (!link) {
      throw new NotFoundException('Aluno não vinculado a você');
    }
    await this.teacherStudentRepository.remove(link);
    return { message: 'Aluno desvinculado com sucesso' };
  }

  async giveStars(teacher: User, childId: string, dto: GiveStarsDto) {
    const child = await this.accessControl.resolveChild(teacher, childId);

    child.currentStars += dto.amount;
    await this.userRepository.save(child);

    const historyEntry = this.historyRepository.create({
      userId: child.id,
      type: HistoryType.STARS_ADD,
      description: `⭐ Professor(a) ${teacher.name}: ${dto.reason}`,
      starsChange: dto.amount,
    });
    await this.historyRepository.save(historyEntry);

    return {
      childId: child.id,
      currentStars: child.currentStars,
      added: dto.amount,
      message: `+${dto.amount} estrela(s) para ${child.name}`,
    };
  }

  async createReport(teacher: User, childId: string, dto: CreateReportDto) {
    const child = await this.accessControl.resolveChild(teacher, childId);

    const report = this.behaviorReportRepository.create({
      childId: child.id,
      teacherId: teacher.id,
      date: dto.date ?? this.getTodayDate(),
      rating: dto.rating ?? null,
      text: dto.text,
      starsAwarded: dto.starsAwarded ?? 0,
    });
    await this.behaviorReportRepository.save(report);

    // Estrelas concedidas junto com o relatório também creditam a criança
    if (report.starsAwarded > 0) {
      child.currentStars += report.starsAwarded;
      await this.userRepository.save(child);

      const historyEntry = this.historyRepository.create({
        userId: child.id,
        type: HistoryType.STARS_ADD,
        description: `⭐ Professor(a) ${teacher.name}: desempenho na escola`,
        starsChange: report.starsAwarded,
      });
      await this.historyRepository.save(historyEntry);
    }

    return {
      id: report.id,
      date: report.date,
      rating: report.rating,
      text: report.text,
      starsAwarded: report.starsAwarded,
      currentStars: child.currentStars,
    };
  }

  async listReports(teacher: User, childId: string) {
    await this.accessControl.resolveChild(teacher, childId);

    const reports = await this.behaviorReportRepository.find({
      where: { childId, teacherId: teacher.id },
      order: { date: 'DESC', createdAt: 'DESC' },
    });

    return reports.map((report) => ({
      id: report.id,
      date: report.date,
      rating: report.rating,
      text: report.text,
      starsAwarded: report.starsAwarded,
      createdAt: report.createdAt,
    }));
  }
}

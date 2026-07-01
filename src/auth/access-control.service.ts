import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, TeacherStudent } from '../entities';

/**
 * Centraliza as regras de acesso entre papéis:
 * - Criança só age sobre si mesma.
 * - Responsável age sobre os próprios filhos.
 * - Professor age sobre alunos vinculados (via código de convite).
 */
@Injectable()
export class AccessControlService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(TeacherStudent)
    private teacherStudentRepository: Repository<TeacherStudent>,
  ) {}

  /**
   * Resolve a criança alvo de uma ação, garantindo que o ator tem permissão.
   * Crianças ignoram childId (sempre agem sobre si). Responsáveis e
   * professores precisam informar childId.
   */
  async resolveChild(actor: User, childId?: string | null): Promise<User> {
    if (actor.role === UserRole.CHILD) {
      if (childId && childId !== actor.id) {
        throw new ForbiddenException('Você não pode acessar dados de outra criança');
      }
      return actor;
    }

    if (!childId) {
      throw new BadRequestException('Informe a criança (childId)');
    }

    const child = await this.userRepository.findOne({
      where: { id: childId },
    });

    if (!child || child.role !== UserRole.CHILD) {
      throw new NotFoundException('Criança não encontrada');
    }

    if (actor.role === UserRole.PARENT) {
      if (child.parentId !== actor.id) {
        throw new ForbiddenException('Essa criança não pertence à sua família');
      }
      return child;
    }

    if (actor.role === UserRole.TEACHER) {
      const link = await this.teacherStudentRepository.findOne({
        where: { teacherId: actor.id, childId: child.id },
      });
      if (!link) {
        throw new ForbiddenException('Aluno não vinculado a você');
      }
      return child;
    }

    throw new ForbiddenException('Acesso negado');
  }

  /**
   * Família (id do responsável) cujos catálogos o usuário enxerga.
   * Para professor, use familyIdOfChild com a criança resolvida.
   */
  familyIdOf(user: User): string {
    if (user.role === UserRole.PARENT) {
      return user.id;
    }
    if (user.role === UserRole.CHILD && user.parentId) {
      return user.parentId;
    }
    throw new ForbiddenException('Usuário sem família associada');
  }

  familyIdOfChild(child: User): string {
    if (!child.parentId) {
      throw new ForbiddenException('Criança sem responsável associado');
    }
    return child.parentId;
  }
}

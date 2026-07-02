import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observation, ObservationType, User } from '../entities';
import { AccessControlService } from '../auth/access-control.service';
import { CreateObservationDto } from './dto/create-observation.dto';

// Registros imutáveis: este serviço não expõe update nem delete de propósito —
// notas clínicas/comportamentais não podem ser reescritas.
@Injectable()
export class ObservationsService {
  constructor(
    @InjectRepository(Observation)
    private observationRepository: Repository<Observation>,
    private accessControl: AccessControlService,
  ) {}

  async create(author: User, dto: CreateObservationDto) {
    const child = await this.accessControl.resolveChild(author, dto.childId);

    const observation = await this.observationRepository.save(
      this.observationRepository.create({
        childId: child.id,
        authorId: author.id,
        authorRole: author.role,
        date: dto.date ?? new Date().toISOString().split('T')[0],
        type: dto.type ?? ObservationType.GENERAL,
        text: dto.text,
      }),
    );

    return {
      id: observation.id,
      childId: observation.childId,
      date: observation.date,
      type: observation.type,
      text: observation.text,
      authorName: author.name,
      authorRole: observation.authorRole,
      createdAt: observation.createdAt,
    };
  }

  // Leitura restrita a adultos com vínculo (o guard do controller barra a criança)
  async findByChild(actor: User, childId: string, limit = 50) {
    const child = await this.accessControl.resolveChild(actor, childId);

    const observations = await this.observationRepository.find({
      where: { childId: child.id },
      relations: ['author'],
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 200),
    });

    return observations.map((observation) => ({
      id: observation.id,
      date: observation.date,
      type: observation.type,
      text: observation.text,
      authorName: observation.author?.name,
      authorRole: observation.authorRole,
      createdAt: observation.createdAt,
    }));
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { FamilySettings } from '../entities';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(FamilySettings)
    private settingsRepository: Repository<FamilySettings>,
  ) {}

  // Criação sob demanda com defaults seguros
  async getOrCreate(familyId: string): Promise<FamilySettings> {
    let settings = await this.settingsRepository.findOne({
      where: { familyId },
    });
    if (!settings) {
      settings = await this.settingsRepository.save(
        this.settingsRepository.create({ familyId }),
      );
    }
    return settings;
  }

  // Leitura dentro de uma transação do motor da meia-noite
  async getWith(manager: EntityManager, familyId: string): Promise<FamilySettings> {
    const settings = await manager.findOne(FamilySettings, {
      where: { familyId },
    });
    return settings ?? manager.create(FamilySettings, { familyId });
  }

  async update(familyId: string, dto: UpdateSettingsDto) {
    const settings = await this.getOrCreate(familyId);
    if (dto.applyDailyPenalty !== undefined) {
      settings.applyDailyPenalty = dto.applyDailyPenalty;
    }
    if (dto.dailyPenaltyStars !== undefined) {
      settings.dailyPenaltyStars = dto.dailyPenaltyStars;
    }
    return this.settingsRepository.save(settings);
  }
}

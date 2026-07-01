import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  User,
  UserRole,
  Task,
  Penalty,
  Reward,
  Routine,
  MysteryPrize,
} from '../entities';
import { generateInviteCode } from '../children/invite-code.util';

/**
 * Migra dados do modelo antigo (papéis admin/user, catálogos globais)
 * para o modelo multi-família. Idempotente: só altera registros legados.
 */
@Injectable()
export class LegacyMigrationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LegacyMigrationService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Penalty)
    private penaltyRepository: Repository<Penalty>,
    @InjectRepository(Reward)
    private rewardRepository: Repository<Reward>,
    @InjectRepository(Routine)
    private routineRepository: Repository<Routine>,
    @InjectRepository(MysteryPrize)
    private mysteryPrizeRepository: Repository<MysteryPrize>,
  ) {}

  async onApplicationBootstrap() {
    // Papéis antigos → novos
    const renamedAdmins = await this.userRepository.update(
      { role: 'admin' as UserRole },
      { role: UserRole.PARENT },
    );
    const renamedUsers = await this.userRepository.update(
      { role: 'user' as UserRole },
      { role: UserRole.CHILD },
    );
    if (renamedAdmins.affected || renamedUsers.affected) {
      this.logger.log(
        `Papéis migrados: ${renamedAdmins.affected ?? 0} admin→parent, ${renamedUsers.affected ?? 0} user→child`,
      );
    }

    // Vincula crianças órfãs e catálogos sem família ao responsável mais antigo
    const firstParent = await this.userRepository.findOne({
      where: { role: UserRole.PARENT },
      order: { createdAt: 'ASC' },
    });

    if (firstParent) {
      const orphans = await this.userRepository.update(
        { role: UserRole.CHILD, parentId: IsNull() },
        { parentId: firstParent.id },
      );
      if (orphans.affected) {
        this.logger.log(
          `${orphans.affected} criança(s) vinculada(s) ao responsável ${firstParent.email}`,
        );
      }

      const catalogs: [string, Repository<{ familyId: string | null }>][] = [
        ['tasks', this.taskRepository],
        ['penalties', this.penaltyRepository],
        ['rewards', this.rewardRepository],
        ['routines', this.routineRepository],
        ['mystery_prizes', this.mysteryPrizeRepository],
      ];
      for (const [name, repo] of catalogs) {
        const result = await repo.update(
          { familyId: IsNull() },
          { familyId: firstParent.id },
        );
        if (result.affected) {
          this.logger.log(`${result.affected} registro(s) de ${name} atribuído(s) à família ${firstParent.email}`);
        }
      }
    }

    // Garante código de convite para todas as crianças
    const childrenWithoutCode = await this.userRepository.find({
      where: { role: UserRole.CHILD, inviteCode: IsNull() },
    });
    for (const child of childrenWithoutCode) {
      child.inviteCode = await this.uniqueInviteCode();
      await this.userRepository.save(child);
    }
    if (childrenWithoutCode.length) {
      this.logger.log(`Código de convite gerado para ${childrenWithoutCode.length} criança(s)`);
    }
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

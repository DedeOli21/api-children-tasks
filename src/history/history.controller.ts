import { Controller, Get, Query } from '@nestjs/common';
import { HistoryService } from './history.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../entities';
import { AccessControlService } from '../auth/access-control.service';

// Linha do tempo completa (casa + escola): responsável, a própria criança e
// a terapeuta. O professor vê apenas o recorte acadêmico (suas missões/relatórios).
@Controller('history')
@Roles(UserRole.PARENT, UserRole.CHILD, UserRole.THERAPIST)
export class HistoryController {
  constructor(
    private readonly historyService: HistoryService,
    private readonly accessControl: AccessControlService,
  ) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('childId') childId?: string,
  ) {
    const child = await this.accessControl.resolveChild(user, childId);
    // Clamp: valores inválidos (NaN, negativos) não chegam ao TypeORM
    const parsed = limit ? parseInt(limit, 10) : NaN;
    const safeLimit = Number.isFinite(parsed)
      ? Math.min(Math.max(parsed, 1), 200)
      : undefined;
    return this.historyService.findAll(child.id, safeLimit);
  }

  @Get('range')
  async findByDateRange(
    @CurrentUser() user: User,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('childId') childId?: string,
  ) {
    const child = await this.accessControl.resolveChild(user, childId);
    return this.historyService.findByDateRange(
      child.id,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('statistics')
  async getStatistics(
    @CurrentUser() user: User,
    @Query('childId') childId?: string,
  ) {
    const child = await this.accessControl.resolveChild(user, childId);
    return this.historyService.getStatistics(child.id);
  }
}

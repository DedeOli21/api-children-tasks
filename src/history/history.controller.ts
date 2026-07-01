import { Controller, Get, Query } from '@nestjs/common';
import { HistoryService } from './history.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessControlService } from '../auth/access-control.service';
import { User } from '../entities';

@Controller('history')
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
    return this.historyService.findAll(
      child.id,
      limit ? parseInt(limit) : undefined,
    );
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

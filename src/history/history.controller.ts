import { Controller, Get, Query } from '@nestjs/common';
import { HistoryService } from './history.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities';

@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
  ) {
    return this.historyService.findAll(user.id, limit ? parseInt(limit) : undefined);
  }

  @Get('range')
  findByDateRange(
    @CurrentUser() user: User,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.historyService.findByDateRange(
      user.id,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('statistics')
  getStatistics(@CurrentUser() user: User) {
    return this.historyService.getStatistics(user.id);
  }
}


import { Controller, Get, Query } from '@nestjs/common';
import { StreaksService } from './streaks.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessControlService } from '../auth/access-control.service';
import { User } from '../entities';

@Controller('streaks')
export class StreaksController {
  constructor(
    private readonly streaksService: StreaksService,
    private readonly accessControl: AccessControlService,
  ) {}

  @Get()
  async getStreak(@CurrentUser() user: User, @Query('childId') childId?: string) {
    const child = await this.accessControl.resolveChild(user, childId);
    return this.streaksService.getStreak(child.id);
  }
}

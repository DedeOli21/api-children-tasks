import { Controller, Get } from '@nestjs/common';
import { StreaksService } from './streaks.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities';

@Controller('streaks')
export class StreaksController {
  constructor(private readonly streaksService: StreaksService) {}

  @Get()
  getStreak(@CurrentUser() user: User) {
    return this.streaksService.getStreak(user.id);
  }
}


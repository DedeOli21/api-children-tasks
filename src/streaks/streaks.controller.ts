import { Controller, Get, Patch, Body, Query } from '@nestjs/common';
import { StreaksService } from './streaks.service';
import { GrantFreezesDto } from './dto/grant-freezes.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessControlService } from '../auth/access-control.service';
import { User, UserRole } from '../entities';

@Controller('streaks')
export class StreaksController {
  constructor(
    private readonly streaksService: StreaksService,
    private readonly accessControl: AccessControlService,
  ) {}

  @Get()
  @Roles(UserRole.PARENT, UserRole.CHILD, UserRole.THERAPIST)
  async getStreak(@CurrentUser() user: User, @Query('childId') childId?: string) {
    const child = await this.accessControl.resolveChild(user, childId);
    return this.streaksService.getStreak(child.id);
  }

  // Responsável concede "Streak Freezes" ao inventário da criança
  @Patch('freezes')
  @Roles(UserRole.PARENT)
  async grantFreezes(@CurrentUser() user: User, @Body() dto: GrantFreezesDto) {
    const child = await this.accessControl.resolveChild(user, dto.childId);
    return this.streaksService.grantFreezes(child.id, dto.amount);
  }
}

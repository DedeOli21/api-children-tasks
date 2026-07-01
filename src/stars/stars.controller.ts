import { Controller, Get, Patch, Body, Query } from '@nestjs/common';
import { StarsService } from './stars.service';
import { UpdateStarsDto } from './dto/update-stars.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessControlService } from '../auth/access-control.service';
import { User, UserRole } from '../entities';

@Controller('stars')
export class StarsController {
  constructor(
    private readonly starsService: StarsService,
    private readonly accessControl: AccessControlService,
  ) {}

  @Get()
  async getStars(@CurrentUser() user: User, @Query('childId') childId?: string) {
    const child = await this.accessControl.resolveChild(user, childId);
    return this.starsService.getStars(child.id);
  }

  // Ajustes manuais de estrelas são exclusivos do responsável
  @Patch('add')
  @Roles(UserRole.PARENT)
  async addStars(@CurrentUser() user: User, @Body() dto: UpdateStarsDto) {
    const child = await this.accessControl.resolveChild(user, dto.childId);
    return this.starsService.addStars(child.id, dto);
  }

  @Patch('subtract')
  @Roles(UserRole.PARENT)
  async subtractStars(@CurrentUser() user: User, @Body() dto: UpdateStarsDto) {
    const child = await this.accessControl.resolveChild(user, dto.childId);
    return this.starsService.subtractStars(child.id, dto);
  }
}

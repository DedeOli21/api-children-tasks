import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { FocusService } from './focus.service';
import { StartFocusDto } from './dto/start-focus.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessControlService } from '../auth/access-control.service';
import { User, UserRole } from '../entities';

@Controller('focus')
export class FocusController {
  constructor(
    private readonly focusService: FocusService,
    private readonly accessControl: AccessControlService,
  ) {}

  // A criança inicia o próprio foco
  @Post()
  @Roles(UserRole.CHILD)
  start(@CurrentUser() user: User, @Body() dto: StartFocusDto) {
    return this.focusService.start(user, dto);
  }

  @Post('start')
  @Roles(UserRole.CHILD)
  startAlias(@CurrentUser() user: User, @Body() dto: StartFocusDto) {
    return this.focusService.start(user, dto);
  }

  @Patch(':id/complete')
  @Roles(UserRole.CHILD)
  complete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.focusService.finish(user, id, 'complete');
  }

  @Patch(':id/abandon')
  @Roles(UserRole.CHILD)
  abandon(@CurrentUser() user: User, @Param('id') id: string) {
    return this.focusService.finish(user, id, 'abandon');
  }

  // Histórico: criança vê o seu; responsável/terapeuta acompanham
  @Get()
  @Roles(UserRole.CHILD, UserRole.PARENT, UserRole.THERAPIST)
  async history(@CurrentUser() user: User, @Query('childId') childId?: string) {
    const child = await this.accessControl.resolveChild(user, childId);
    return this.focusService.history(child.id);
  }
}

import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../entities';
import { ActiveTasksService } from './active-tasks.service';

@Controller('active-tasks')
@Roles(UserRole.PARENT, UserRole.CHILD)
export class ActiveTasksController {
  constructor(private readonly activeTasksService: ActiveTasksService) {}

  @Get('day')
  forDay(
    @CurrentUser() user: User,
    @Query('date') date?: string,
    @Query('childId') childId?: string,
  ) {
    const day = date ?? new Date().toISOString().split('T')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      throw new BadRequestException('Data inválida (use AAAA-MM-DD)');
    }
    return this.activeTasksService.forDay(user, childId, day);
  }

  @Get('pending-approval')
  @Roles(UserRole.PARENT)
  pendingApproval(
    @CurrentUser() user: User,
    @Query('childId') childId?: string,
  ) {
    return this.activeTasksService.pendingApproval(user, childId);
  }

  @Patch(':id/complete')
  complete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.activeTasksService.complete(user, id);
  }

  @Patch(':id/uncomplete')
  uncomplete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.activeTasksService.uncomplete(user, id);
  }

  @Patch(':id/approve')
  @Roles(UserRole.PARENT)
  approve(@CurrentUser() user: User, @Param('id') id: string) {
    return this.activeTasksService.approve(user, id);
  }
}

import { Controller, Get, Patch, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities';

// Cada usuário só enxerga as próprias notificações (qualquer papel)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: User, @Query('limit') limit?: string) {
    const parsed = limit ? parseInt(limit, 10) : NaN;
    return this.notificationsService.list(user.id, Number.isFinite(parsed) ? parsed : 50);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: User) {
    return this.notificationsService.unreadCount(user.id);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllRead(user.id);
  }
}

import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../entities';

// Mensagens diretas entre adultos da equipe (professor ↔ terapeuta).
// Criança e responsável não participam deste canal.
@Controller('messages')
@Roles(UserRole.TEACHER, UserRole.THERAPIST)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  send(@CurrentUser() user: User, @Body() dto: SendMessageDto) {
    return this.messagesService.send(user, dto);
  }

  @Get('contacts')
  contacts(@CurrentUser() user: User, @Query('childId') childId: string) {
    return this.messagesService.contacts(user, childId);
  }

  @Get('thread')
  thread(
    @CurrentUser() user: User,
    @Query('childId') childId: string,
    @Query('withUserId') withUserId: string,
  ) {
    return this.messagesService.thread(user, childId, withUserId);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: User) {
    return this.messagesService.unreadCount(user);
  }
}

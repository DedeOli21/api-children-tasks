import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessControlService } from '../auth/access-control.service';
import { User, UserRole } from '../entities';

// Eventos Surpresa (multiplicadores de estrelas)
@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly accessControl: AccessControlService,
  ) {}

  @Post()
  @Roles(UserRole.PARENT)
  create(@CurrentUser() user: User, @Body() dto: CreateEventDto) {
    return this.eventsService.create(user.id, dto);
  }

  // Criança também lê (banner "Estrelas em Dobro!" na tela dela)
  @Get()
  @Roles(UserRole.PARENT, UserRole.CHILD)
  findAll(@CurrentUser() user: User) {
    return this.eventsService.findAll(this.accessControl.familyIdOf(user));
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.PARENT)
  deactivate(@CurrentUser() user: User, @Param('id') id: string) {
    return this.eventsService.deactivate(user.id, id);
  }
}

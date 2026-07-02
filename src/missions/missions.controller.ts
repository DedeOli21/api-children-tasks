import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { MissionsService } from './missions.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { AllocateMissionDto } from './dto/allocate-mission.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../entities';

@Controller('missions')
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  // ============ PROFESSOR ============

  @Post()
  @Roles(UserRole.TEACHER)
  create(@CurrentUser() user: User, @Body() dto: CreateMissionDto) {
    return this.missionsService.create(user, dto);
  }

  @Get('sent')
  @Roles(UserRole.TEACHER)
  listSent(@CurrentUser() user: User) {
    return this.missionsService.listForTeacher(user);
  }

  // ============ RESPONSÁVEL ============

  @Get('inbox')
  @Roles(UserRole.PARENT)
  inbox(@CurrentUser() user: User) {
    return this.missionsService.inbox(user);
  }

  @Get('pending-approval')
  @Roles(UserRole.PARENT)
  pendingApproval(@CurrentUser() user: User) {
    return this.missionsService.pendingApproval(user);
  }

  @Patch(':id/allocate')
  @Roles(UserRole.PARENT)
  allocate(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: AllocateMissionDto,
  ) {
    return this.missionsService.allocate(user, id, dto);
  }

  @Patch(':id/unschedule')
  @Roles(UserRole.PARENT)
  unschedule(@CurrentUser() user: User, @Param('id') id: string) {
    return this.missionsService.backToInbox(user, id);
  }

  @Patch(':id/approve')
  @Roles(UserRole.PARENT)
  approve(@CurrentUser() user: User, @Param('id') id: string) {
    return this.missionsService.approve(user, id);
  }

  // ============ CRIANÇA / DIA ============

  @Get('day')
  @Roles(UserRole.PARENT, UserRole.CHILD)
  forDay(
    @CurrentUser() user: User,
    @Query('date') date?: string,
    @Query('childId') childId?: string,
  ) {
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Data inválida (use AAAA-MM-DD)');
    }
    const day = date ?? new Date().toISOString().split('T')[0];
    return this.missionsService.forDay(user, childId, day);
  }

  @Patch(':id/complete')
  @Roles(UserRole.PARENT, UserRole.CHILD)
  markAsDone(@CurrentUser() user: User, @Param('id') id: string) {
    return this.missionsService.markAsDone(user, id);
  }

  // ============ REMOÇÃO ============

  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.PARENT)
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.missionsService.remove(user, id);
  }
}

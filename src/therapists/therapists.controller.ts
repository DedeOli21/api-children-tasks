import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { TherapistsService } from './therapists.service';
import { CreateTherapistDto } from './dto/create-therapist.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../entities';

@Controller('therapists')
export class TherapistsController {
  constructor(private readonly therapistsService: TherapistsService) {}

  // ============ RESPONSÁVEL: gestão de acesso ============

  @Post()
  @Roles(UserRole.PARENT)
  createOrLink(@CurrentUser() user: User, @Body() dto: CreateTherapistDto) {
    return this.therapistsService.createOrLink(user, dto);
  }

  @Get()
  @Roles(UserRole.PARENT)
  listForParent(@CurrentUser() user: User) {
    return this.therapistsService.listForParent(user);
  }

  @Delete(':therapistId/children/:childId')
  @Roles(UserRole.PARENT)
  unlink(
    @CurrentUser() user: User,
    @Param('therapistId') therapistId: string,
    @Param('childId') childId: string,
  ) {
    return this.therapistsService.unlink(user, therapistId, childId);
  }

  // ============ TERAPEUTA: pacientes, timeline e analytics ============

  @Get('patients')
  @Roles(UserRole.THERAPIST)
  listPatients(@CurrentUser() user: User) {
    return this.therapistsService.listPatients(user);
  }

  @Get('patients/:childId/timeline')
  @Roles(UserRole.THERAPIST, UserRole.PARENT)
  timeline(
    @CurrentUser() user: User,
    @Param('childId') childId: string,
    @Query('days') days?: string,
  ) {
    const parsed = days ? parseInt(days, 10) : NaN;
    const safeDays = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 90) : 14;
    return this.therapistsService.timeline(user, childId, safeDays);
  }

  @Get('patients/:childId/analytics')
  @Roles(UserRole.THERAPIST, UserRole.PARENT)
  analytics(
    @CurrentUser() user: User,
    @Param('childId') childId: string,
    @Query('days') days?: string,
  ) {
    const parsed = days ? parseInt(days, 10) : NaN;
    const safeDays = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 7), 90) : 30;
    return this.therapistsService.analytics(user, childId, safeDays);
  }
}

import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ObservationsService } from './observations.service';
import { CreateObservationDto } from './dto/create-observation.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../entities';

// Notas clínicas/comportamentais: a CRIANÇA nunca acessa este controller.
// Sem rotas de update/delete — o registro é imutável por design.
@Controller('observations')
export class ObservationsController {
  constructor(private readonly observationsService: ObservationsService) {}

  // Terapeuta e professor inserem notas
  @Post()
  @Roles(UserRole.THERAPIST, UserRole.TEACHER)
  create(@CurrentUser() user: User, @Body() dto: CreateObservationDto) {
    return this.observationsService.create(user, dto);
  }

  // Adultos vinculados leem
  @Get()
  @Roles(UserRole.PARENT, UserRole.THERAPIST, UserRole.TEACHER)
  findByChild(
    @CurrentUser() user: User,
    @Query('childId') childId: string,
    @Query('limit') limit?: string,
  ) {
    const parsed = limit ? parseInt(limit, 10) : NaN;
    return this.observationsService.findByChild(
      user,
      childId,
      Number.isFinite(parsed) ? parsed : 50,
    );
  }
}

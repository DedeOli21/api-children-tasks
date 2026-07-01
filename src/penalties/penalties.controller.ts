import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { PenaltiesService } from './penalties.service';
import { CreatePenaltyDto } from './dto/create-penalty.dto';
import { UpdatePenaltyDto } from './dto/update-penalty.dto';
import { ApplyPenaltyDto } from './dto/apply-penalty.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessControlService } from '../auth/access-control.service';
import { User, UserRole } from '../entities';

@Controller('penalties')
export class PenaltiesController {
  constructor(
    private readonly penaltiesService: PenaltiesService,
    private readonly accessControl: AccessControlService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.penaltiesService.findAll(this.accessControl.familyIdOf(user));
  }

  @Post()
  @Roles(UserRole.PARENT)
  create(@CurrentUser() user: User, @Body() createPenaltyDto: CreatePenaltyDto) {
    return this.penaltiesService.create(createPenaltyDto, user.id);
  }

  @Patch(':id')
  @Roles(UserRole.PARENT)
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updatePenaltyDto: UpdatePenaltyDto,
  ) {
    return this.penaltiesService.update(id, updatePenaltyDto, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.PARENT)
  delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.penaltiesService.delete(id, user.id);
  }

  // Apenas o responsável aplica penalidades, sempre sobre uma criança
  @Post('apply')
  @Roles(UserRole.PARENT)
  async applyPenalty(@CurrentUser() user: User, @Body() dto: ApplyPenaltyDto) {
    const child = await this.accessControl.resolveChild(user, dto.childId);
    return this.penaltiesService.applyPenalty(child.id, user.id, dto);
  }
}

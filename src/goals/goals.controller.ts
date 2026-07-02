import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { DepositDto } from './dto/deposit.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessControlService } from '../auth/access-control.service';
import { User, UserRole } from '../entities';

// Cofrinho Compartilhado: metas cooperativas da família
@Controller('goals')
@Roles(UserRole.PARENT, UserRole.CHILD)
export class GoalsController {
  constructor(
    private readonly goalsService: GoalsService,
    private readonly accessControl: AccessControlService,
  ) {}

  @Post()
  @Roles(UserRole.PARENT)
  create(@CurrentUser() user: User, @Body() dto: CreateGoalDto) {
    return this.goalsService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.goalsService.findAll(this.accessControl.familyIdOf(user));
  }

  @Get(':id/deposits')
  deposits(@CurrentUser() user: User, @Param('id') id: string) {
    return this.goalsService.deposits(this.accessControl.familyIdOf(user), id);
  }

  // Criança deposita do próprio saldo; responsável pode depositar pelo filho
  @Post(':id/deposit')
  async deposit(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: DepositDto,
  ) {
    const child = await this.accessControl.resolveChild(user, dto.childId);
    return this.goalsService.deposit(
      this.accessControl.familyIdOfChild(child),
      id,
      child,
      dto.amount,
    );
  }

  @Patch(':id/cancel')
  @Roles(UserRole.PARENT)
  cancel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.goalsService.cancel(user.id, id);
  }

  @Patch(':id/complete')
  @Roles(UserRole.PARENT)
  complete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.goalsService.complete(user.id, id);
  }
}

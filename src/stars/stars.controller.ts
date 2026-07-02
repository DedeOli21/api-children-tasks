import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { StarsService } from './stars.service';
import { UpdateStarsDto } from './dto/update-stars.dto';
import { SuggestStarsDto } from './dto/suggest-stars.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessControlService } from '../auth/access-control.service';
import { User, UserRole, StarRequestStatus } from '../entities';

@Controller('stars')
export class StarsController {
  constructor(
    private readonly starsService: StarsService,
    private readonly accessControl: AccessControlService,
  ) {}

  @Get()
  @Roles(UserRole.PARENT, UserRole.CHILD, UserRole.THERAPIST)
  async getStars(@CurrentUser() user: User, @Query('childId') childId?: string) {
    const child = await this.accessControl.resolveChild(user, childId);
    return this.starsService.getStars(child.id);
  }

  // Ajustes manuais de estrelas são exclusivos do responsável
  @Patch('add')
  @Roles(UserRole.PARENT)
  async addStars(@CurrentUser() user: User, @Body() dto: UpdateStarsDto) {
    const child = await this.accessControl.resolveChild(user, dto.childId);
    return this.starsService.addStars(child.id, dto);
  }

  @Patch('subtract')
  @Roles(UserRole.PARENT)
  async subtractStars(@CurrentUser() user: User, @Body() dto: UpdateStarsDto) {
    const child = await this.accessControl.resolveChild(user, dto.childId);
    return this.starsService.subtractStars(child.id, dto);
  }

  // ============ BONIFICAÇÃO DA TERAPEUTA ============

  // Terapeuta sugere estrelas com justificativa obrigatória (validada no DTO)
  @Post('suggest')
  @Roles(UserRole.THERAPIST)
  async suggest(@CurrentUser() user: User, @Body() dto: SuggestStarsDto) {
    const child = await this.accessControl.resolveChild(user, dto.childId);
    return this.starsService.suggest(user, child, dto);
  }

  // Caixa de aprovação do responsável (?status=approved|rejected para histórico)
  @Get('requests')
  @Roles(UserRole.PARENT)
  listRequests(@CurrentUser() user: User, @Query('status') status?: string) {
    const parsed = Object.values(StarRequestStatus).includes(status as StarRequestStatus)
      ? (status as StarRequestStatus)
      : undefined;
    return this.starsService.listRequestsForParent(user, parsed);
  }

  // Sugestões enviadas pela terapeuta
  @Get('requests/mine')
  @Roles(UserRole.THERAPIST)
  listMyRequests(@CurrentUser() user: User) {
    return this.starsService.listRequestsForTherapist(user);
  }

  // Dispara o crédito real na conta da criança
  @Patch('approve/:id')
  @Roles(UserRole.PARENT)
  approve(@CurrentUser() user: User, @Param('id') id: string) {
    return this.starsService.approveRequest(user, id);
  }

  @Patch('reject/:id')
  @Roles(UserRole.PARENT)
  reject(@CurrentUser() user: User, @Param('id') id: string) {
    return this.starsService.rejectRequest(user, id);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { MysteryBoxService } from './mystery-box.service';
import { CreateMysteryPrizeDto } from './dto/create-mystery-prize.dto';
import { UpdateMysteryPrizeDto } from './dto/update-mystery-prize.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessControlService } from '../auth/access-control.service';
import { User, UserRole } from '../entities';

@Controller('mystery-box')
export class MysteryBoxController {
  constructor(
    private readonly mysteryBoxService: MysteryBoxService,
    private readonly accessControl: AccessControlService,
  ) {}

  @Get()
  getConfig(@CurrentUser() user: User) {
    return this.mysteryBoxService.getConfig(this.accessControl.familyIdOf(user));
  }

  // Criança abre a própria caixa; responsável pode abrir para o filho (?childId=)
  @Post('open')
  async openBox(@CurrentUser() user: User, @Query('childId') childId?: string) {
    const child = await this.accessControl.resolveChild(user, childId);
    return this.mysteryBoxService.openBox(
      child.id,
      this.accessControl.familyIdOfChild(child),
    );
  }

  @Get('prizes')
  @Roles(UserRole.PARENT)
  findAll(@CurrentUser() user: User) {
    return this.mysteryBoxService.findAll(user.id);
  }

  @Post('prizes')
  @Roles(UserRole.PARENT)
  create(@CurrentUser() user: User, @Body() createDto: CreateMysteryPrizeDto) {
    return this.mysteryBoxService.create(createDto, user.id);
  }

  @Patch('prizes/:id')
  @Roles(UserRole.PARENT)
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateDto: UpdateMysteryPrizeDto,
  ) {
    return this.mysteryBoxService.update(id, updateDto, user.id);
  }

  @Delete('prizes/:id')
  @Roles(UserRole.PARENT)
  delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.mysteryBoxService.delete(id, user.id);
  }
}

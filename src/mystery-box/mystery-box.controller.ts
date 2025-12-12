import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { MysteryBoxService } from './mystery-box.service';
import { CreateMysteryPrizeDto } from './dto/create-mystery-prize.dto';
import { UpdateMysteryPrizeDto } from './dto/update-mystery-prize.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../entities';

@Controller('mystery-box')
export class MysteryBoxController {
  constructor(private readonly mysteryBoxService: MysteryBoxService) {}

  @Get()
  getConfig(@CurrentUser() user: User) {
    return this.mysteryBoxService.getConfig();
  }

  @Post('open')
  openBox(@CurrentUser() user: User) {
    return this.mysteryBoxService.openBox(user.id);
  }

  @Get('prizes')
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.mysteryBoxService.findAll();
  }

  @Post('prizes')
  @Roles(UserRole.ADMIN)
  create(@Body() createDto: CreateMysteryPrizeDto) {
    return this.mysteryBoxService.create(createDto);
  }

  @Patch('prizes/:id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateDto: UpdateMysteryPrizeDto) {
    return this.mysteryBoxService.update(id, updateDto);
  }

  @Delete('prizes/:id')
  @Roles(UserRole.ADMIN)
  delete(@Param('id') id: string) {
    return this.mysteryBoxService.delete(id);
  }
}


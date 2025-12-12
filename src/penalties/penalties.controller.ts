import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { PenaltiesService } from './penalties.service';
import { CreatePenaltyDto } from './dto/create-penalty.dto';
import { UpdatePenaltyDto } from './dto/update-penalty.dto';
import { ApplyPenaltyDto } from './dto/apply-penalty.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../entities';

@Controller('penalties')
export class PenaltiesController {
  constructor(private readonly penaltiesService: PenaltiesService) {}

  @Get()
  findAll() {
    return this.penaltiesService.findAll();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createPenaltyDto: CreatePenaltyDto) {
    return this.penaltiesService.create(createPenaltyDto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updatePenaltyDto: UpdatePenaltyDto) {
    return this.penaltiesService.update(id, updatePenaltyDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  delete(@Param('id') id: string) {
    return this.penaltiesService.delete(id);
  }

  @Post('apply')
  @Roles(UserRole.ADMIN)
  applyPenalty(@CurrentUser() user: User, @Body() dto: ApplyPenaltyDto) {
    return this.penaltiesService.applyPenalty(user.id, dto);
  }
}


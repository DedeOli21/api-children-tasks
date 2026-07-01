import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessControlService } from '../auth/access-control.service';
import { User, UserRole } from '../entities';

@Controller('rewards')
export class RewardsController {
  constructor(
    private readonly rewardsService: RewardsService,
    private readonly accessControl: AccessControlService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.rewardsService.findAll(this.accessControl.familyIdOf(user));
  }

  @Post()
  @Roles(UserRole.PARENT)
  create(@CurrentUser() user: User, @Body() createRewardDto: CreateRewardDto) {
    return this.rewardsService.create(createRewardDto, user.id);
  }

  @Patch(':id')
  @Roles(UserRole.PARENT)
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateRewardDto: UpdateRewardDto,
  ) {
    return this.rewardsService.update(id, updateRewardDto, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.PARENT)
  delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.rewardsService.delete(id, user.id);
  }

  // Criança resgata para si; responsável pode resgatar em nome do filho (?childId=)
  @Post(':id/redeem')
  async redeemReward(
    @CurrentUser() user: User,
    @Param('id') rewardId: string,
    @Query('childId') childId?: string,
  ) {
    const child = await this.accessControl.resolveChild(user, childId);
    return this.rewardsService.redeemReward(
      child.id,
      rewardId,
      this.accessControl.familyIdOfChild(child),
    );
  }
}

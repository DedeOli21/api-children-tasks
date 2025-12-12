import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { CreateRewardDto } from './dto/create-reward.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../entities';

@Controller('rewards')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get()
  findAll() {
    return this.rewardsService.findAll();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createRewardDto: CreateRewardDto) {
    return this.rewardsService.create(createRewardDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  delete(@Param('id') id: string) {
    return this.rewardsService.delete(id);
  }

  @Post(':id/redeem')
  redeemReward(@CurrentUser() user: User, @Param('id') rewardId: string) {
    return this.rewardsService.redeemReward(user.id, rewardId);
  }
}


import { Controller, Get, Patch, Body } from '@nestjs/common';
import { StarsService } from './stars.service';
import { UpdateStarsDto } from './dto/update-stars.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities';

@Controller('stars')
export class StarsController {
  constructor(private readonly starsService: StarsService) {}

  @Get()
  getStars(@CurrentUser() user: User) {
    return this.starsService.getStars(user.id);
  }

  @Patch('add')
  addStars(@CurrentUser() user: User, @Body() dto: UpdateStarsDto) {
    return this.starsService.addStars(user.id, dto);
  }

  @Patch('subtract')
  subtractStars(@CurrentUser() user: User, @Body() dto: UpdateStarsDto) {
    return this.starsService.subtractStars(user.id, dto);
  }
}


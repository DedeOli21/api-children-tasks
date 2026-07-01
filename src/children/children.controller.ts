import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ChildrenService } from './children.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../entities';

@Controller('children')
@Roles(UserRole.PARENT)
export class ChildrenController {
  constructor(private readonly childrenService: ChildrenService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateChildDto) {
    return this.childrenService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.childrenService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.childrenService.findOne(user.id, id);
  }

  @Get(':id/reports')
  findReports(@CurrentUser() user: User, @Param('id') id: string) {
    return this.childrenService.findReports(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateChildDto,
  ) {
    return this.childrenService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.childrenService.remove(user.id, id);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../entities';
import { CreateTaskTemplateDto } from './dto/create-task-template.dto';
import { UpdateTaskTemplateDto } from './dto/update-task-template.dto';
import { TaskTemplatesService } from './task-templates.service';

@Controller('task-templates')
@Roles(UserRole.PARENT)
export class TaskTemplatesController {
  constructor(private readonly templatesService: TaskTemplatesService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateTaskTemplateDto) {
    return this.templatesService.create(user, dto);
  }

  @Get()
  findAll(@CurrentUser() user: User, @Query('childId') childId?: string) {
    return this.templatesService.findAll(user, childId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.templatesService.findOne(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateTaskTemplateDto,
  ) {
    return this.templatesService.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.templatesService.remove(user, id);
  }
}

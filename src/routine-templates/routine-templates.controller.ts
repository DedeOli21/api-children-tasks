import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { RoutineTemplatesService } from './routine-templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { InstantiateTemplateDto } from './dto/instantiate-template.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../entities';

// Templates de rotina são ferramenta do responsável
@Controller('routine-templates')
@Roles(UserRole.PARENT)
export class RoutineTemplatesController {
  constructor(private readonly templatesService: RoutineTemplatesService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateTemplateDto) {
    return this.templatesService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.templatesService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.templatesService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templatesService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.templatesService.remove(user.id, id);
  }

  // Materializa o template como tarefas reais no dia da criança
  @Post(':id/instantiate')
  instantiate(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: InstantiateTemplateDto,
  ) {
    return this.templatesService.instantiate(user, id, dto);
  }
}

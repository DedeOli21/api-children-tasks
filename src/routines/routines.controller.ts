import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { RoutinesService } from './routines.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities';

@Controller('routines')
export class RoutinesController {
  constructor(private readonly routinesService: RoutinesService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.routinesService.findAll(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.routinesService.findOne(id, user.id);
  }

  @Post()
  create(@Body() createRoutineDto: CreateRoutineDto) {
    return this.routinesService.create(createRoutineDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRoutineDto: UpdateRoutineDto) {
    return this.routinesService.update(id, updateRoutineDto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.routinesService.delete(id);
  }

  @Post(':id/tasks/:taskId')
  addTask(@Param('id') routineId: string, @Param('taskId') taskId: string) {
    return this.routinesService.addTask(routineId, taskId);
  }

  @Delete(':id/tasks/:taskId')
  removeTask(@Param('id') routineId: string, @Param('taskId') taskId: string) {
    return this.routinesService.removeTask(routineId, taskId);
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string, @CurrentUser() user: User) {
    return this.routinesService.complete(id, user.id);
  }

  @Patch(':id/uncomplete')
  uncomplete(@Param('id') id: string, @CurrentUser() user: User) {
    return this.routinesService.uncomplete(id, user.id);
  }

  @Get('progress/today')
  getTodayProgress(@CurrentUser() user: User) {
    return this.routinesService.getTodayProgress(user.id);
  }
}


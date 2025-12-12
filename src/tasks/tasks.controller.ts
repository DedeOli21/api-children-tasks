import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../entities';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.tasksService.findAll(user.id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(createTaskDto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.update(id, updateTaskDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  delete(@Param('id') id: string) {
    return this.tasksService.delete(id);
  }

  @Patch(':id/complete')
  completeTask(@CurrentUser() user: User, @Param('id') taskId: string) {
    return this.tasksService.completeTask(user.id, taskId);
  }

  @Patch(':id/uncomplete')
  uncompleteTask(@CurrentUser() user: User, @Param('id') taskId: string) {
    return this.tasksService.uncompleteTask(user.id, taskId);
  }

  @Post('reset')
  @Roles(UserRole.ADMIN)
  resetTasks(@CurrentUser() user: User) {
    return this.tasksService.resetTasks(user.id);
  }
}


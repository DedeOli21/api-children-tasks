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
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessControlService } from '../auth/access-control.service';
import { User, UserRole } from '../entities';

// Escopo de gamificação: apenas responsável e a própria criança.
// Professor não deve completar/resetar tarefas do aluno — seu acesso
// se limita a /teacher/students/:id/stars e /reports.
@Controller('tasks')
@Roles(UserRole.PARENT, UserRole.CHILD)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly accessControl: AccessControlService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: User, @Query('childId') childId?: string) {
    const child = await this.accessControl.resolveChild(user, childId);
    return this.tasksService.findAll(
      child.id,
      this.accessControl.familyIdOfChild(child),
    );
  }

  // Fila "Aguardando Revisão" do responsável
  @Get('pending-approval')
  @Roles(UserRole.PARENT)
  pendingApproval(
    @CurrentUser() user: User,
    @Query('childId') childId?: string,
  ) {
    return this.tasksService.pendingApproval(user.id, childId);
  }

  // Aprova a execução e libera as estrelas (workflow de aprovação)
  @Patch('logs/:logId/approve')
  @Roles(UserRole.PARENT)
  approveLog(@CurrentUser() user: User, @Param('logId') logId: string) {
    return this.tasksService.approveLog(user.id, logId);
  }

  @Post()
  @Roles(UserRole.PARENT)
  create(@CurrentUser() user: User, @Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(createTaskDto, user.id);
  }

  @Patch(':id')
  @Roles(UserRole.PARENT)
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, updateTaskDto, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.PARENT)
  delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.tasksService.delete(id, user.id);
  }

  @Patch(':id/complete')
  async completeTask(
    @CurrentUser() user: User,
    @Param('id') taskId: string,
    @Query('childId') childId?: string,
  ) {
    const child = await this.accessControl.resolveChild(user, childId);
    return this.tasksService.completeTask(child.id, taskId);
  }

  @Patch(':id/uncomplete')
  async uncompleteTask(
    @CurrentUser() user: User,
    @Param('id') taskId: string,
    @Query('childId') childId?: string,
  ) {
    const child = await this.accessControl.resolveChild(user, childId);
    return this.tasksService.uncompleteTask(child.id, taskId);
  }

  @Post('reset')
  @Roles(UserRole.PARENT)
  async resetTasks(
    @CurrentUser() user: User,
    @Query('childId') childId?: string,
  ) {
    const child = await this.accessControl.resolveChild(user, childId);
    return this.tasksService.resetTasks(child.id);
  }
}

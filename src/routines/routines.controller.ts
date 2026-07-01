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
import { RoutinesService } from './routines.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessControlService } from '../auth/access-control.service';
import { User, UserRole } from '../entities';

@Controller('routines')
export class RoutinesController {
  constructor(
    private readonly routinesService: RoutinesService,
    private readonly accessControl: AccessControlService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: User, @Query('childId') childId?: string) {
    const child = await this.accessControl.resolveChild(user, childId);
    return this.routinesService.findAll(
      child.id,
      this.accessControl.familyIdOfChild(child),
    );
  }

  @Get('progress/today')
  async getTodayProgress(
    @CurrentUser() user: User,
    @Query('childId') childId?: string,
  ) {
    const child = await this.accessControl.resolveChild(user, childId);
    return this.routinesService.getTodayProgress(
      child.id,
      this.accessControl.familyIdOfChild(child),
    );
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query('childId') childId?: string,
  ) {
    const child = await this.accessControl.resolveChild(user, childId);
    return this.routinesService.findOne(
      id,
      child.id,
      this.accessControl.familyIdOfChild(child),
    );
  }

  @Post()
  @Roles(UserRole.PARENT)
  create(@CurrentUser() user: User, @Body() createRoutineDto: CreateRoutineDto) {
    return this.routinesService.create(createRoutineDto, user.id);
  }

  @Patch(':id')
  @Roles(UserRole.PARENT)
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateRoutineDto: UpdateRoutineDto,
  ) {
    return this.routinesService.update(id, updateRoutineDto, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.PARENT)
  delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.routinesService.delete(id, user.id);
  }

  @Post(':id/tasks/:taskId')
  @Roles(UserRole.PARENT)
  addTask(
    @CurrentUser() user: User,
    @Param('id') routineId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.routinesService.addTask(routineId, taskId, user.id);
  }

  @Delete(':id/tasks/:taskId')
  @Roles(UserRole.PARENT)
  removeTask(
    @CurrentUser() user: User,
    @Param('id') routineId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.routinesService.removeTask(routineId, taskId, user.id);
  }

  @Patch(':id/complete')
  async complete(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query('childId') childId?: string,
  ) {
    const child = await this.accessControl.resolveChild(user, childId);
    return this.routinesService.complete(
      id,
      child.id,
      this.accessControl.familyIdOfChild(child),
    );
  }

  @Patch(':id/uncomplete')
  async uncomplete(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query('childId') childId?: string,
  ) {
    const child = await this.accessControl.resolveChild(user, childId);
    return this.routinesService.uncomplete(
      id,
      child.id,
      this.accessControl.familyIdOfChild(child),
    );
  }
}

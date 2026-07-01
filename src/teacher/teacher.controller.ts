import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { LinkStudentDto } from './dto/link-student.dto';
import { GiveStarsDto } from './dto/give-stars.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../entities';

@Controller('teacher')
@Roles(UserRole.TEACHER)
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Post('students')
  linkStudent(@CurrentUser() user: User, @Body() dto: LinkStudentDto) {
    return this.teacherService.linkStudent(user, dto);
  }

  @Get('students')
  listStudents(@CurrentUser() user: User) {
    return this.teacherService.listStudents(user);
  }

  @Delete('students/:childId')
  unlinkStudent(@CurrentUser() user: User, @Param('childId') childId: string) {
    return this.teacherService.unlinkStudent(user, childId);
  }

  @Post('students/:childId/stars')
  giveStars(
    @CurrentUser() user: User,
    @Param('childId') childId: string,
    @Body() dto: GiveStarsDto,
  ) {
    return this.teacherService.giveStars(user, childId, dto);
  }

  @Post('students/:childId/reports')
  createReport(
    @CurrentUser() user: User,
    @Param('childId') childId: string,
    @Body() dto: CreateReportDto,
  ) {
    return this.teacherService.createReport(user, childId, dto);
  }

  @Get('students/:childId/reports')
  listReports(@CurrentUser() user: User, @Param('childId') childId: string) {
    return this.teacherService.listReports(user, childId);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProactiveRequestStatus, User, UserRole } from '../entities';
import { CreateProactiveRequestDto } from './dto/create-proactive-request.dto';
import { ReviewProactiveRequestDto } from './dto/review-proactive-request.dto';
import { ProactiveRequestsService } from './proactive-requests.service';

@Controller('proactive-requests')
export class ProactiveRequestsController {
  constructor(
    private readonly proactiveRequestsService: ProactiveRequestsService,
  ) {}

  @Post()
  @Roles(UserRole.CHILD)
  create(@CurrentUser() user: User, @Body() dto: CreateProactiveRequestDto) {
    return this.proactiveRequestsService.create(user, dto);
  }

  @Get()
  @Roles(UserRole.PARENT, UserRole.CHILD)
  list(
    @CurrentUser() user: User,
    @Query('status') status?: string,
    @Query('childId') childId?: string,
  ) {
    const parsedStatus = this.parseStatus(status);
    if (user.role === UserRole.CHILD) {
      return this.proactiveRequestsService.listForChild(user, parsedStatus);
    }
    return this.proactiveRequestsService.listForParent(user, {
      childId,
      status: parsedStatus,
    });
  }

  @Get('pending')
  @Roles(UserRole.PARENT)
  listPending(@CurrentUser() user: User, @Query('childId') childId?: string) {
    return this.proactiveRequestsService.listForParent(user, {
      childId,
      status: ProactiveRequestStatus.PENDING,
    });
  }

  @Patch(':id/approve')
  @Roles(UserRole.PARENT)
  approve(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ReviewProactiveRequestDto,
  ) {
    return this.proactiveRequestsService.approve(user, id, dto);
  }

  @Patch(':id/reject')
  @Roles(UserRole.PARENT)
  reject(@CurrentUser() user: User, @Param('id') id: string) {
    return this.proactiveRequestsService.reject(user, id);
  }

  private parseStatus(status?: string): ProactiveRequestStatus | undefined {
    return Object.values(ProactiveRequestStatus).includes(
      status as ProactiveRequestStatus,
    )
      ? (status as ProactiveRequestStatus)
      : undefined;
  }
}

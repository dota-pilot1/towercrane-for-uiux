import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  ProjectScheduleService,
  type ProjectScheduleUser,
} from './project-schedule.service';

@Controller('project-schedules')
@UseGuards(AuthGuard)
export class ProjectScheduleController {
  constructor(
    private readonly projectScheduleService: ProjectScheduleService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: ProjectScheduleUser,
    @Query() query: Record<string, unknown>,
  ) {
    return this.projectScheduleService.list(user, query);
  }

  @Post()
  create(@CurrentUser() user: ProjectScheduleUser, @Body() body: unknown) {
    return this.projectScheduleService.create(user, body);
  }

  @Post('reorder')
  reorder(@CurrentUser() user: ProjectScheduleUser, @Body() body: unknown) {
    return this.projectScheduleService.reorder(user, body);
  }

  @Get(':scheduleId')
  detail(
    @CurrentUser() user: ProjectScheduleUser,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.projectScheduleService.detail(user, scheduleId);
  }

  @Patch(':scheduleId')
  update(
    @CurrentUser() user: ProjectScheduleUser,
    @Param('scheduleId') scheduleId: string,
    @Body() body: unknown,
  ) {
    return this.projectScheduleService.update(user, scheduleId, body);
  }

  @Delete(':scheduleId')
  delete(
    @CurrentUser() user: ProjectScheduleUser,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.projectScheduleService.delete(user, scheduleId);
  }
}

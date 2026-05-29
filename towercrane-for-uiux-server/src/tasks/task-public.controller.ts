import { Controller, Get, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import { TasksService } from './tasks.service';

@Controller('public/tasks')
export class TaskPublicController {
  constructor(private readonly tasksService: TasksService) {}

  @Get(':taskId/plan-reference')
  getPlanReference(@Param('taskId') taskId: string, @Req() request: Request) {
    return this.tasksService.getTaskPlanReference(taskId, request);
  }
}

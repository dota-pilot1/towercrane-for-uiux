import { Controller, Get, Param } from '@nestjs/common';
import { TasksService } from './tasks.service';

@Controller('public/tasks')
export class TaskPublicController {
  constructor(private readonly tasksService: TasksService) {}

  @Get(':taskId/plan-reference')
  getPlanReference(@Param('taskId') taskId: string) {
    return this.tasksService.getTaskPlanReference(taskId);
  }
}

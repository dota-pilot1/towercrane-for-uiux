import { Body, Controller, Headers, Param, Post } from '@nestjs/common';
import { TasksService } from './tasks.service';

@Controller('public/tasks/agent')
export class TaskAgentController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('workspaces/:workspaceId/commit-tasks')
  createWorkspaceCommitTasks(
    @Headers('x-towercrane-agent-key') agentKey: string | undefined,
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
  ) {
    return this.tasksService.createAgentCommitTasks(
      agentKey,
      workspaceId,
      body,
    );
  }
}

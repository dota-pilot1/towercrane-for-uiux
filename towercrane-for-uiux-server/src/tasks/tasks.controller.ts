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
import { TasksService, type TaskUser } from './tasks.service';

@Controller('tasks')
@UseGuards(AuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  list(@CurrentUser() user: TaskUser, @Query() query: Record<string, unknown>) {
    return this.tasksService.listTasks(user, query);
  }

  @Post('reorder')
  reorder(@CurrentUser() user: TaskUser, @Body() body: unknown) {
    return this.tasksService.reorderTasks(user, body);
  }

  @Post('archive')
  archive(@CurrentUser() user: TaskUser, @Body() body: unknown) {
    return this.tasksService.archiveTasks(user, body);
  }

  @Post('restore')
  restore(@CurrentUser() user: TaskUser, @Body() body: unknown) {
    return this.tasksService.restoreTasks(user, body);
  }

  @Post('completed/bulk')
  createCompletedTasks(@CurrentUser() user: TaskUser, @Body() body: unknown) {
    return this.tasksService.createCompletedTasks(user, null, body);
  }

  // ── Workspace endpoints (정적 라우트 — :taskId 보다 먼저 등록) ─────────────

  @Get('workspaces')
  listWorkspacesEarly(
    @CurrentUser() user: TaskUser,
    @Query() query: Record<string, unknown>,
  ) {
    return this.tasksService.listWorkspaces(user, query);
  }

  @Post('workspaces')
  createWorkspaceEarly(@CurrentUser() user: TaskUser, @Body() body: unknown) {
    return this.tasksService.createWorkspace(user, body);
  }

  @Post('workspaces/reorder')
  reorderWorkspacesEarly(@CurrentUser() user: TaskUser, @Body() body: unknown) {
    return this.tasksService.reorderWorkspaces(user, body);
  }

  @Patch('workspaces/:workspaceId')
  updateWorkspaceEarly(
    @CurrentUser() user: TaskUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
  ) {
    return this.tasksService.updateWorkspace(user, workspaceId, body);
  }

  @Delete('workspaces/:workspaceId')
  deleteWorkspaceEarly(
    @CurrentUser() user: TaskUser,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.tasksService.deleteWorkspace(user, workspaceId);
  }

  @Get('workspaces/:workspaceId/tasks')
  listWorkspaceTasksEarly(
    @CurrentUser() user: TaskUser,
    @Param('workspaceId') workspaceId: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.tasksService.listWorkspaceTasks(user, workspaceId, query);
  }

  @Post('workspaces/:workspaceId/tasks')
  createWorkspaceTaskEarly(
    @CurrentUser() user: TaskUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
  ) {
    return this.tasksService.createWorkspaceTask(user, workspaceId, body);
  }

  @Post('workspaces/:workspaceId/completed/bulk')
  createWorkspaceCompletedTasksEarly(
    @CurrentUser() user: TaskUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
  ) {
    return this.tasksService.createCompletedTasks(user, workspaceId, body);
  }

  @Post('workspaces/:workspaceId/codex/commit-tasks')
  createWorkspaceCodexCommitTasksEarly(
    @CurrentUser() user: TaskUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
  ) {
    return this.tasksService.createCodexCommitTasks(user, workspaceId, body);
  }

  @Post('workspaces/:workspaceId/agent/commit-tasks')
  createWorkspaceAgentCommitTasksEarly(
    @CurrentUser() user: TaskUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
  ) {
    return this.tasksService.createCodexCommitTasks(user, workspaceId, body);
  }

  @Get(':taskId')
  detail(@CurrentUser() user: TaskUser, @Param('taskId') taskId: string) {
    return this.tasksService.getTaskDetail(user, taskId);
  }

  @Post()
  create(@CurrentUser() user: TaskUser, @Body() body: unknown) {
    return this.tasksService.createTask(user, body);
  }

  @Patch(':taskId')
  update(
    @CurrentUser() user: TaskUser,
    @Param('taskId') taskId: string,
    @Body() body: unknown,
  ) {
    return this.tasksService.updateTask(user, taskId, body);
  }

  @Delete(':taskId')
  delete(@CurrentUser() user: TaskUser, @Param('taskId') taskId: string) {
    return this.tasksService.deleteTask(user, taskId);
  }

  @Patch(':taskId/status')
  updateStatus(
    @CurrentUser() user: TaskUser,
    @Param('taskId') taskId: string,
    @Body() body: unknown,
  ) {
    return this.tasksService.updateTaskStatus(user, taskId, body);
  }

  @Patch(':taskId/priority')
  updatePriority(
    @CurrentUser() user: TaskUser,
    @Param('taskId') taskId: string,
    @Body() body: unknown,
  ) {
    return this.tasksService.updateTaskPriority(user, taskId, body);
  }

  @Patch(':taskId/assignee')
  updateAssignee(
    @CurrentUser() user: TaskUser,
    @Param('taskId') taskId: string,
    @Body() body: unknown,
  ) {
    return this.tasksService.updateTaskAssignee(user, taskId, body);
  }

  @Get(':taskId/checklists')
  listChecklists(
    @CurrentUser() user: TaskUser,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.listChecklists(user, taskId);
  }

  @Post(':taskId/checklists')
  createChecklist(
    @CurrentUser() user: TaskUser,
    @Param('taskId') taskId: string,
    @Body() body: unknown,
  ) {
    return this.tasksService.createChecklist(user, taskId, body);
  }

  @Patch(':taskId/checklists/:checklistId')
  updateChecklist(
    @CurrentUser() user: TaskUser,
    @Param('taskId') taskId: string,
    @Param('checklistId') checklistId: string,
    @Body() body: unknown,
  ) {
    return this.tasksService.updateChecklist(user, taskId, checklistId, body);
  }

  @Patch(':taskId/checklists/:checklistId/toggle')
  toggleChecklist(
    @CurrentUser() user: TaskUser,
    @Param('taskId') taskId: string,
    @Param('checklistId') checklistId: string,
  ) {
    return this.tasksService.toggleChecklist(user, taskId, checklistId);
  }

  @Delete(':taskId/checklists/:checklistId')
  deleteChecklist(
    @CurrentUser() user: TaskUser,
    @Param('taskId') taskId: string,
    @Param('checklistId') checklistId: string,
  ) {
    return this.tasksService.deleteChecklist(user, taskId, checklistId);
  }

  @Get(':taskId/comments')
  listComments(@CurrentUser() user: TaskUser, @Param('taskId') taskId: string) {
    return this.tasksService.listComments(user, taskId);
  }

  @Post(':taskId/comments')
  createComment(
    @CurrentUser() user: TaskUser,
    @Param('taskId') taskId: string,
    @Body() body: unknown,
  ) {
    return this.tasksService.createComment(user, taskId, body);
  }

  @Patch(':taskId/comments/:commentId')
  updateComment(
    @CurrentUser() user: TaskUser,
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
    @Body() body: unknown,
  ) {
    return this.tasksService.updateComment(user, taskId, commentId, body);
  }

  @Delete(':taskId/comments/:commentId')
  deleteComment(
    @CurrentUser() user: TaskUser,
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.tasksService.deleteComment(user, taskId, commentId);
  }

  @Get(':taskId/activity')
  listActivity(@CurrentUser() user: TaskUser, @Param('taskId') taskId: string) {
    return this.tasksService.listActivity(user, taskId);
  }

  @Get(':taskId/ai-reviews')
  listAiReviews(
    @CurrentUser() user: TaskUser,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.listAiReviews(user, taskId);
  }

  @Get(':taskId/attachments')
  listAttachments(
    @CurrentUser() user: TaskUser,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.listAttachments(user, taskId);
  }

  @Post(':taskId/attachments')
  createAttachment(
    @CurrentUser() user: TaskUser,
    @Param('taskId') taskId: string,
    @Body() body: unknown,
  ) {
    return this.tasksService.createAttachment(user, taskId, body);
  }

  @Delete(':taskId/attachments/:attachmentId')
  deleteAttachment(
    @CurrentUser() user: TaskUser,
    @Param('taskId') taskId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.tasksService.deleteAttachment(user, taskId, attachmentId);
  }
}

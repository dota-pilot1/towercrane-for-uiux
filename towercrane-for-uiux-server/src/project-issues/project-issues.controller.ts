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
  ProjectIssuesService,
  type ProjectIssueUser,
} from './project-issues.service';

@Controller('project-issues')
@UseGuards(AuthGuard)
export class ProjectIssuesController {
  constructor(private readonly projectIssuesService: ProjectIssuesService) {}

  @Get()
  list(
    @CurrentUser() user: ProjectIssueUser,
    @Query() query: Record<string, unknown>,
  ) {
    return this.projectIssuesService.listProjectIssues(user, query);
  }

  @Get('workspaces')
  listWorkspaces(@Query() query: Record<string, unknown>) {
    return this.projectIssuesService.listWorkspaces(query);
  }

  @Post('workspaces')
  createWorkspace(
    @CurrentUser() user: ProjectIssueUser,
    @Body() body: unknown,
  ) {
    return this.projectIssuesService.createWorkspace(user, body);
  }

  @Patch('workspaces/:workspaceId')
  updateWorkspace(
    @CurrentUser() user: ProjectIssueUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
  ) {
    return this.projectIssuesService.updateWorkspace(user, workspaceId, body);
  }

  @Delete('workspaces/:workspaceId')
  deleteWorkspace(
    @CurrentUser() user: ProjectIssueUser,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.projectIssuesService.deleteWorkspace(user, workspaceId);
  }

  @Get('categories')
  listCategories(@Query() query: Record<string, unknown>) {
    return this.projectIssuesService.listCategories(query);
  }

  @Post('categories')
  createCategory(@CurrentUser() user: ProjectIssueUser, @Body() body: unknown) {
    return this.projectIssuesService.createCategory(user, body);
  }

  @Patch('categories/:categoryId')
  updateCategory(
    @CurrentUser() user: ProjectIssueUser,
    @Param('categoryId') categoryId: string,
    @Body() body: unknown,
  ) {
    return this.projectIssuesService.updateCategory(user, categoryId, body);
  }

  @Delete('categories/:categoryId')
  deleteCategory(
    @CurrentUser() user: ProjectIssueUser,
    @Param('categoryId') categoryId: string,
  ) {
    return this.projectIssuesService.deleteCategory(user, categoryId);
  }

  @Post('reorder')
  reorder(@CurrentUser() user: ProjectIssueUser, @Body() body: unknown) {
    return this.projectIssuesService.reorderProjectIssues(user, body);
  }

  @Post('archive')
  archive(@CurrentUser() user: ProjectIssueUser, @Body() body: unknown) {
    return this.projectIssuesService.archiveProjectIssues(user, body);
  }

  @Post('restore')
  restore(@CurrentUser() user: ProjectIssueUser, @Body() body: unknown) {
    return this.projectIssuesService.restoreProjectIssues(user, body);
  }

  @Get(':issueId')
  detail(
    @CurrentUser() user: ProjectIssueUser,
    @Param('issueId') issueId: string,
  ) {
    return this.projectIssuesService.getProjectIssueDetail(user, issueId);
  }

  @Post()
  create(@CurrentUser() user: ProjectIssueUser, @Body() body: unknown) {
    return this.projectIssuesService.createProjectIssue(user, body);
  }

  @Patch(':issueId')
  update(
    @CurrentUser() user: ProjectIssueUser,
    @Param('issueId') issueId: string,
    @Body() body: unknown,
  ) {
    return this.projectIssuesService.updateProjectIssue(user, issueId, body);
  }

  @Delete(':issueId')
  delete(
    @CurrentUser() user: ProjectIssueUser,
    @Param('issueId') issueId: string,
  ) {
    return this.projectIssuesService.deleteProjectIssue(user, issueId);
  }

  @Patch(':issueId/status')
  updateStatus(
    @CurrentUser() user: ProjectIssueUser,
    @Param('issueId') issueId: string,
    @Body() body: unknown,
  ) {
    return this.projectIssuesService.updateProjectIssueStatus(
      user,
      issueId,
      body,
    );
  }

  @Patch(':issueId/priority')
  updatePriority(
    @CurrentUser() user: ProjectIssueUser,
    @Param('issueId') issueId: string,
    @Body() body: unknown,
  ) {
    return this.projectIssuesService.updateProjectIssuePriority(
      user,
      issueId,
      body,
    );
  }

  @Patch(':issueId/assignee')
  updateAssignee(
    @CurrentUser() user: ProjectIssueUser,
    @Param('issueId') issueId: string,
    @Body() body: unknown,
  ) {
    return this.projectIssuesService.updateProjectIssueAssignee(
      user,
      issueId,
      body,
    );
  }

  @Get(':issueId/checklists')
  listChecklists(
    @CurrentUser() user: ProjectIssueUser,
    @Param('issueId') issueId: string,
  ) {
    return this.projectIssuesService.listChecklists(user, issueId);
  }

  @Post(':issueId/checklists')
  createChecklist(
    @CurrentUser() user: ProjectIssueUser,
    @Param('issueId') issueId: string,
    @Body() body: unknown,
  ) {
    return this.projectIssuesService.createChecklist(user, issueId, body);
  }

  @Patch(':issueId/checklists/:checklistId')
  updateChecklist(
    @CurrentUser() user: ProjectIssueUser,
    @Param('issueId') issueId: string,
    @Param('checklistId') checklistId: string,
    @Body() body: unknown,
  ) {
    return this.projectIssuesService.updateChecklist(
      user,
      issueId,
      checklistId,
      body,
    );
  }

  @Patch(':issueId/checklists/:checklistId/toggle')
  toggleChecklist(
    @CurrentUser() user: ProjectIssueUser,
    @Param('issueId') issueId: string,
    @Param('checklistId') checklistId: string,
  ) {
    return this.projectIssuesService.toggleChecklist(
      user,
      issueId,
      checklistId,
    );
  }

  @Delete(':issueId/checklists/:checklistId')
  deleteChecklist(
    @CurrentUser() user: ProjectIssueUser,
    @Param('issueId') issueId: string,
    @Param('checklistId') checklistId: string,
  ) {
    return this.projectIssuesService.deleteChecklist(
      user,
      issueId,
      checklistId,
    );
  }

  @Get(':issueId/comments')
  listComments(
    @CurrentUser() user: ProjectIssueUser,
    @Param('issueId') issueId: string,
  ) {
    return this.projectIssuesService.listComments(user, issueId);
  }

  @Post(':issueId/comments')
  createComment(
    @CurrentUser() user: ProjectIssueUser,
    @Param('issueId') issueId: string,
    @Body() body: unknown,
  ) {
    return this.projectIssuesService.createComment(user, issueId, body);
  }

  @Patch(':issueId/comments/:commentId')
  updateComment(
    @CurrentUser() user: ProjectIssueUser,
    @Param('issueId') issueId: string,
    @Param('commentId') commentId: string,
    @Body() body: unknown,
  ) {
    return this.projectIssuesService.updateComment(
      user,
      issueId,
      commentId,
      body,
    );
  }

  @Delete(':issueId/comments/:commentId')
  deleteComment(
    @CurrentUser() user: ProjectIssueUser,
    @Param('issueId') issueId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.projectIssuesService.deleteComment(user, issueId, commentId);
  }

  @Get(':issueId/activity')
  listActivity(
    @CurrentUser() user: ProjectIssueUser,
    @Param('issueId') issueId: string,
  ) {
    return this.projectIssuesService.listActivity(user, issueId);
  }

  @Get(':issueId/attachments')
  listAttachments(
    @CurrentUser() user: ProjectIssueUser,
    @Param('issueId') issueId: string,
  ) {
    return this.projectIssuesService.listAttachments(user, issueId);
  }

  @Post(':issueId/attachments')
  createAttachment(
    @CurrentUser() user: ProjectIssueUser,
    @Param('issueId') issueId: string,
    @Body() body: unknown,
  ) {
    return this.projectIssuesService.createAttachment(user, issueId, body);
  }

  @Delete(':issueId/attachments/:attachmentId')
  deleteAttachment(
    @CurrentUser() user: ProjectIssueUser,
    @Param('issueId') issueId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.projectIssuesService.deleteAttachment(
      user,
      issueId,
      attachmentId,
    );
  }
}

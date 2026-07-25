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
import { IssuesService, type IssueUser } from './issues.service';

@Controller('issues')
@UseGuards(AuthGuard)
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Get()
  list(
    @CurrentUser() user: IssueUser,
    @Query() query: Record<string, unknown>,
  ) {
    return this.issuesService.listIssues(user, query);
  }

  @Post('reorder')
  reorder(@CurrentUser() user: IssueUser, @Body() body: unknown) {
    return this.issuesService.reorderIssues(user, body);
  }

  @Get(':issueId')
  detail(@CurrentUser() user: IssueUser, @Param('issueId') issueId: string) {
    return this.issuesService.getIssueDetail(user, issueId);
  }

  @Post()
  create(@CurrentUser() user: IssueUser, @Body() body: unknown) {
    return this.issuesService.createIssue(user, body);
  }

  @Patch(':issueId')
  update(
    @CurrentUser() user: IssueUser,
    @Param('issueId') issueId: string,
    @Body() body: unknown,
  ) {
    return this.issuesService.updateIssue(user, issueId, body);
  }

  @Delete(':issueId')
  delete(@CurrentUser() user: IssueUser, @Param('issueId') issueId: string) {
    return this.issuesService.deleteIssue(user, issueId);
  }

  @Patch(':issueId/status')
  updateStatus(
    @CurrentUser() user: IssueUser,
    @Param('issueId') issueId: string,
    @Body() body: unknown,
  ) {
    return this.issuesService.updateIssueStatus(user, issueId, body);
  }

  @Get(':issueId/comments')
  listComments(
    @CurrentUser() user: IssueUser,
    @Param('issueId') issueId: string,
  ) {
    return this.issuesService.listComments(user, issueId);
  }

  @Post(':issueId/comments')
  createComment(
    @CurrentUser() user: IssueUser,
    @Param('issueId') issueId: string,
    @Body() body: unknown,
  ) {
    return this.issuesService.createComment(user, issueId, body);
  }

  @Patch(':issueId/comments/:commentId')
  updateComment(
    @CurrentUser() user: IssueUser,
    @Param('issueId') issueId: string,
    @Param('commentId') commentId: string,
    @Body() body: unknown,
  ) {
    return this.issuesService.updateComment(user, issueId, commentId, body);
  }

  @Delete(':issueId/comments/:commentId')
  deleteComment(
    @CurrentUser() user: IssueUser,
    @Param('issueId') issueId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.issuesService.deleteComment(user, issueId, commentId);
  }
}

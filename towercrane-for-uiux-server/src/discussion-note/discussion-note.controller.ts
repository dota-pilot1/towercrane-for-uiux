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
  DiscussionNoteService,
  type DiscussionNoteUser,
} from './discussion-note.service';

@Controller('discussion-note')
@UseGuards(AuthGuard)
export class DiscussionNoteController {
  constructor(private readonly discussionNoteService: DiscussionNoteService) {}

  @Get()
  list(
    @CurrentUser() user: DiscussionNoteUser,
    @Query() query: Record<string, unknown>,
  ) {
    return this.discussionNoteService.list(user, query);
  }

  @Post()
  create(@CurrentUser() user: DiscussionNoteUser, @Body() body: unknown) {
    return this.discussionNoteService.create(user, body);
  }

  @Get(':noteId')
  detail(
    @CurrentUser() user: DiscussionNoteUser,
    @Param('noteId') noteId: string,
  ) {
    return this.discussionNoteService.detail(user, noteId);
  }

  @Patch(':noteId')
  update(
    @CurrentUser() user: DiscussionNoteUser,
    @Param('noteId') noteId: string,
    @Body() body: unknown,
  ) {
    return this.discussionNoteService.update(user, noteId, body);
  }

  @Delete(':noteId')
  delete(
    @CurrentUser() user: DiscussionNoteUser,
    @Param('noteId') noteId: string,
  ) {
    return this.discussionNoteService.delete(user, noteId);
  }

  @Post(':noteId/comments')
  createComment(
    @CurrentUser() user: DiscussionNoteUser,
    @Param('noteId') noteId: string,
    @Body() body: unknown,
  ) {
    return this.discussionNoteService.createComment(user, noteId, body);
  }

  @Patch('comments/:commentId')
  updateComment(
    @CurrentUser() user: DiscussionNoteUser,
    @Param('commentId') commentId: string,
    @Body() body: unknown,
  ) {
    return this.discussionNoteService.updateComment(user, commentId, body);
  }

  @Delete('comments/:commentId')
  deleteComment(
    @CurrentUser() user: DiscussionNoteUser,
    @Param('commentId') commentId: string,
  ) {
    return this.discussionNoteService.deleteComment(user, commentId);
  }
}

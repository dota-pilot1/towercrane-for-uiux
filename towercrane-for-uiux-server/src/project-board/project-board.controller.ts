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
  ProjectBoardService,
  type ProjectBoardUser,
} from './project-board.service';

@Controller('project-board')
@UseGuards(AuthGuard)
export class ProjectBoardController {
  constructor(private readonly projectBoardService: ProjectBoardService) {}

  @Get('boards')
  listBoards(@CurrentUser() user: ProjectBoardUser) {
    return this.projectBoardService.listBoards(user);
  }

  @Post('boards')
  createBoard(@CurrentUser() user: ProjectBoardUser, @Body() body: unknown) {
    return this.projectBoardService.createBoard(user, body);
  }

  @Patch('boards/:boardId')
  updateBoard(
    @CurrentUser() user: ProjectBoardUser,
    @Param('boardId') boardId: string,
    @Body() body: unknown,
  ) {
    return this.projectBoardService.updateBoard(user, boardId, body);
  }

  @Delete('boards/:boardId')
  deleteBoard(
    @CurrentUser() user: ProjectBoardUser,
    @Param('boardId') boardId: string,
  ) {
    return this.projectBoardService.deleteBoard(user, boardId);
  }

  @Get('boards/:boardId/posts')
  listPosts(
    @CurrentUser() user: ProjectBoardUser,
    @Param('boardId') boardId: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.projectBoardService.listPosts(user, boardId, query);
  }

  @Post('boards/:boardId/posts')
  createPost(
    @CurrentUser() user: ProjectBoardUser,
    @Param('boardId') boardId: string,
    @Body() body: unknown,
  ) {
    return this.projectBoardService.createPost(user, boardId, body);
  }

  @Get('posts/:postId')
  detailPost(
    @CurrentUser() user: ProjectBoardUser,
    @Param('postId') postId: string,
  ) {
    return this.projectBoardService.detailPost(user, postId);
  }

  @Patch('posts/:postId')
  updatePost(
    @CurrentUser() user: ProjectBoardUser,
    @Param('postId') postId: string,
    @Body() body: unknown,
  ) {
    return this.projectBoardService.updatePost(user, postId, body);
  }

  @Delete('posts/:postId')
  deletePost(
    @CurrentUser() user: ProjectBoardUser,
    @Param('postId') postId: string,
  ) {
    return this.projectBoardService.deletePost(user, postId);
  }
}

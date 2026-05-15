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
import { BoardsService, type BoardUser } from './boards.service';

@Controller('boards')
@UseGuards(AuthGuard)
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Get('configs')
  listConfigs() {
    return this.boardsService.listActiveConfigs();
  }

  @Get(':code')
  list(@Param('code') code: string, @Query() query: Record<string, unknown>) {
    return this.boardsService.listBoards(code, query);
  }

  @Get(':code/:boardId')
  detail(
    @CurrentUser() user: BoardUser,
    @Param('code') code: string,
    @Param('boardId') boardId: string,
  ) {
    return this.boardsService.getBoardDetail(code, boardId, user);
  }

  @Post(':code')
  create(
    @CurrentUser() user: BoardUser,
    @Param('code') code: string,
    @Body() body: unknown,
  ) {
    return this.boardsService.createBoard(code, user, body);
  }

  @Patch(':code/:boardId')
  update(
    @CurrentUser() user: BoardUser,
    @Param('code') code: string,
    @Param('boardId') boardId: string,
    @Body() body: unknown,
  ) {
    return this.boardsService.updateBoard(code, boardId, user, body);
  }

  @Delete(':code/:boardId')
  delete(
    @CurrentUser() user: BoardUser,
    @Param('code') code: string,
    @Param('boardId') boardId: string,
  ) {
    return this.boardsService.deleteBoard(code, boardId, user);
  }

  @Get(':code/:boardId/comments')
  listComments(@Param('code') code: string, @Param('boardId') boardId: string) {
    return this.boardsService.listComments(code, boardId);
  }

  @Post(':code/:boardId/comments')
  createComment(
    @CurrentUser() user: BoardUser,
    @Param('code') code: string,
    @Param('boardId') boardId: string,
    @Body() body: unknown,
  ) {
    return this.boardsService.createComment(code, boardId, user, body);
  }
}


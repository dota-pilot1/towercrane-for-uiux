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
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BoardsService, type BoardUser } from './boards.service';

@Controller('admin/boards')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AdminBoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Get('inquiries/unanswered-count')
  unansweredCount() {
    return this.boardsService.unansweredInquiryCount();
  }

  @Get(':code')
  list(@Param('code') code: string, @Query() query: Record<string, unknown>) {
    return this.boardsService.listBoards(code, query, true);
  }

  @Post(':code')
  create(
    @CurrentUser() user: BoardUser,
    @Param('code') code: string,
    @Body() body: unknown,
  ) {
    return this.boardsService.createBoard(code, user, body, true);
  }

  @Get(':code/:boardId')
  detail(
    @CurrentUser() user: BoardUser,
    @Param('code') code: string,
    @Param('boardId') boardId: string,
  ) {
    return this.boardsService.getBoardDetail(code, boardId, user, true);
  }

  @Patch(':code/:boardId')
  update(
    @CurrentUser() user: BoardUser,
    @Param('code') code: string,
    @Param('boardId') boardId: string,
    @Body() body: unknown,
  ) {
    return this.boardsService.updateBoard(code, boardId, user, body, true);
  }

  @Delete(':code/:boardId')
  delete(
    @CurrentUser() user: BoardUser,
    @Param('code') code: string,
    @Param('boardId') boardId: string,
  ) {
    return this.boardsService.deleteBoard(code, boardId, user, true);
  }

  @Patch(':code/:boardId/status')
  updateStatus(
    @Param('code') code: string,
    @Param('boardId') boardId: string,
    @Body() body: unknown,
  ) {
    return this.boardsService.updateBoardStatus(code, boardId, body);
  }

  @Patch(':code/:boardId/pin')
  pin(@Param('code') code: string, @Param('boardId') boardId: string) {
    return this.boardsService.pinBoard(code, boardId);
  }

  @Patch(':code/:boardId/unpin')
  unpin(@Param('code') code: string, @Param('boardId') boardId: string) {
    return this.boardsService.unpinBoard(code, boardId);
  }

  @Post(':code/:boardId/replies')
  reply(
    @CurrentUser() user: BoardUser,
    @Param('code') code: string,
    @Param('boardId') boardId: string,
    @Body() body: unknown,
  ) {
    return this.boardsService.createComment(code, boardId, user, body, true);
  }
}

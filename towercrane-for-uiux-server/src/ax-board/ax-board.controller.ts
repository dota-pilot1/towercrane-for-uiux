import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard } from '../auth/guard/session.guard';
import type { SessionRequest } from '../auth/types';
import {
  axBoardCategorySchema,
  createAxBoardCommentSchema,
  createAxBoardPostSchema,
  updateAxBoardPostSchema,
} from './dto/ax-board.schema';
import { AxBoardService } from './ax-board.service';

@Controller('ax-board')
@UseGuards(SessionGuard)
export class AxBoardController {
  constructor(private readonly axBoardService: AxBoardService) {}

  @Get('posts')
  listPosts(@Req() req: SessionRequest, @Query('category') category?: string) {
    const parsed = axBoardCategorySchema.safeParse(category);
    return this.axBoardService.listPosts(
      req.user.id,
      parsed.success ? parsed.data : undefined,
    );
  }

  @Get('posts/:postId')
  getPost(@Req() req: SessionRequest, @Param('postId') postId: string) {
    return this.axBoardService.getPost(req.user.id, postId);
  }

  @Post('posts')
  createPost(@Req() req: SessionRequest, @Body() body: unknown) {
    const input = createAxBoardPostSchema.parse(body);
    return this.axBoardService.createPost(req.user.id, input);
  }

  @Patch('posts/:postId')
  updatePost(
    @Req() req: SessionRequest,
    @Param('postId') postId: string,
    @Body() body: unknown,
  ) {
    const input = updateAxBoardPostSchema.parse(body);
    return this.axBoardService.updatePost(req.user.id, postId, input);
  }

  @Delete('posts/:postId')
  deletePost(@Req() req: SessionRequest, @Param('postId') postId: string) {
    return this.axBoardService.deletePost(req.user.id, postId);
  }

  @Post('posts/:postId/comments')
  addComment(
    @Req() req: SessionRequest,
    @Param('postId') postId: string,
    @Body() body: unknown,
  ) {
    const input = createAxBoardCommentSchema.parse(body);
    return this.axBoardService.addComment(req.user.id, postId, input);
  }

  @Delete('comments/:commentId')
  deleteComment(
    @Req() req: SessionRequest,
    @Param('commentId') commentId: string,
  ) {
    return this.axBoardService.deleteComment(req.user.id, commentId);
  }
}

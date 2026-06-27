import {
  Body,
  Controller,
  ForbiddenException,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthService } from '../auth/auth.service';
import { EnglishChatService, type ChatMessage } from './english-chat.service';

type User = ReturnType<AuthService['getSessionUser']>;

@Controller('english-chat')
export class EnglishChatController {
  constructor(private readonly englishChatService: EnglishChatService) {}

  // 영어 회화 스트리밍 (클라이언트가 messages 히스토리 보유 — 상태 비저장)
  @Post('stream')
  @UseGuards(AuthGuard)
  async stream(
    @CurrentUser() user: User,
    @Body() body: { messages: ChatMessage[] },
    @Res() res: Response,
  ) {
    if (!user.aiAccess && user.role !== 'admin') {
      throw new ForbiddenException(
        'AI 서비스 사용 권한이 없습니다. 서비스 신청 후 승인을 받아주세요.',
      );
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await this.englishChatService.stream(body.messages ?? [], res);
  }
}

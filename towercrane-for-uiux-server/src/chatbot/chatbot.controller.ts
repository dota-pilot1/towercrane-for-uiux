import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthService } from '../auth/auth.service';
import { ChatbotSessionService } from './chatbot-session.service';
import { ChatbotStreamService } from './chatbot-stream.service';
import { ChatbotRealtimeService } from './chatbot-realtime.service';

type User = ReturnType<AuthService['getSessionUser']>;

/** 스트리밍 라우트가 공유하는 body. 어느 모드인지는 URL이 말해준다 */
type StreamBody = {
  sessionId: string;
  message: string;
  fileUrls?: string[];
};

@UseGuards(AuthGuard)
@Controller('chatbot')
export class ChatbotController {
  constructor(
    private readonly sessionService: ChatbotSessionService,
    private readonly streamService: ChatbotStreamService,
    private readonly realtimeService: ChatbotRealtimeService,
  ) {}

  @Get('sessions')
  listSessions(@CurrentUser() user: User) {
    return this.sessionService.listSessions(user.id);
  }

  @Post('sessions')
  createSession(@CurrentUser() user: User, @Body() body: { title?: string }) {
    return this.sessionService.createSession(user.id, body?.title);
  }

  @Patch('sessions/:id')
  renameSession(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { title: string },
  ) {
    return this.sessionService.renameSession(id, body.title, user.id);
  }

  @Delete('sessions/:id')
  deleteSession(@CurrentUser() user: User, @Param('id') id: string) {
    return this.sessionService.deleteSession(id, user.id);
  }

  @Get('sessions/:id/messages')
  listMessages(@CurrentUser() user: User, @Param('id') id: string) {
    return this.sessionService.listMessages(id, user.id);
  }

  /**
   * SSE 응답을 시작하겠다고 선언한다.
   *
   * @Res() 로 raw Response 를 직접 받는 게 핵심 — Nest 가 응답을 대신 닫아버리면
   * 스트리밍이 불가능하다. 이 헤더 3줄과 Content-Length 를 안 정하는 것까지가
   * "끝을 모른 채 조금씩 보내기"의 조건이다.
   * (운영에선 nginx 의 proxy_buffering off 도 함께 필요하다)
   */
  private openSseStream(res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
  }

  /** 기본 채팅 · 스트리밍 응답 · 파일 첨부 */
  @Post('stream')
  async stream(
    @CurrentUser() user: User,
    @Body() body: StreamBody,
    @Res() res: Response,
  ) {
    this.openSseStream(res);
    await this.streamService.streamPlain(
      body.sessionId,
      body.message,
      user,
      res,
      {
        fileUrls: body.fileUrls,
      },
    );
  }

  /** 도구 호출 — GPT가 툴을 쓸지 스스로 판단한다 (Function Calling) */
  @Post('stream/tools')
  async streamTools(
    @CurrentUser() user: User,
    @Body() body: StreamBody,
    @Res() res: Response,
  ) {
    this.openSseStream(res);
    await this.streamService.streamTools(
      body.sessionId,
      body.message,
      user,
      res,
      {
        fileUrls: body.fileUrls,
      },
    );
  }

  @Post('realtime/session')
  createRealtimeSession(
    @CurrentUser() user: User,
    @Body()
    body: {
      model?: string;
      voice?: string;
      language?: string;
      turnMode?: 'server_vad' | 'push_to_talk';
      responseMode?: 'text_audio' | 'text_only' | 'audio_only';
      instructions?: string;
      enabledTools?: string[];
    },
  ) {
    return this.realtimeService.createRealtimeClientSecret(user, body ?? {});
  }

  @Post('realtime/tools/execute')
  executeRealtimeTool(
    @CurrentUser() user: User,
    @Body()
    body: {
      callId?: string;
      name: string;
      source?: 'realtime' | 'manual_test';
      arguments?: Record<string, unknown>;
    },
  ) {
    return this.realtimeService.executeRealtimeTool(user, body);
  }
}

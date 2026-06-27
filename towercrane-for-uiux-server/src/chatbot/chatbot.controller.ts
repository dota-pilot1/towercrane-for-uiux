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
import { ChatbotService } from './chatbot.service';
import type { KnowledgeChannel } from '../database/schema';

type User = ReturnType<AuthService['getSessionUser']>;

@UseGuards(AuthGuard)
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Get('sessions')
  listSessions(@CurrentUser() user: User) {
    return this.chatbotService.listSessions(user.id);
  }

  @Post('sessions')
  createSession(@CurrentUser() user: User, @Body() body: { title?: string }) {
    return this.chatbotService.createSession(user.id, body?.title);
  }

  @Patch('sessions/:id')
  renameSession(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { title: string },
  ) {
    return this.chatbotService.renameSession(id, body.title, user.id);
  }

  @Delete('sessions/:id')
  deleteSession(@CurrentUser() user: User, @Param('id') id: string) {
    return this.chatbotService.deleteSession(id, user.id);
  }

  @Get('sessions/:id/messages')
  listMessages(@CurrentUser() user: User, @Param('id') id: string) {
    return this.chatbotService.listMessages(id, user.id);
  }

  @Post('stream')
  async stream(
    @CurrentUser() user: User,
    @Body()
    body: {
      sessionId: string;
      message: string;
      fileUrls?: string[];
      // STEP 5: body에 tools 모드 추가
      mode?: 'general' | 'knowledge' | 'tools';
      channels?: KnowledgeChannel[];
    },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await this.chatbotService.streamGpt(body.sessionId, body.message, user, res, {
      fileUrls: body.fileUrls,
      mode: body.mode,
      channels: body.channels,
    });
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
    return this.chatbotService.createRealtimeClientSecret(user, body ?? {});
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
    return this.chatbotService.executeRealtimeTool(user, body);
  }
}
